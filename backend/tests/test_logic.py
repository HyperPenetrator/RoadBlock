import pytest
import math
import time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app, _haversine_m, _nearest_neighbor_tsp, GeoLocation

client = TestClient(app)


def test_haversine_known_distance():
    # Bangalore city center to Electronic City: ~18km
    dist = _haversine_m(12.9716, 77.5946, 12.8399, 77.6770)
    assert 17_000 < dist < 19_500


def test_haversine_same_point_is_zero():
    assert _haversine_m(12.97, 77.59, 12.97, 77.59) == pytest.approx(0.0, abs=1e-6)


def test_tsp_two_points_unchanged():
    wps = [GeoLocation(lat=12.0, lng=77.0), GeoLocation(lat=13.0, lng=78.0)]
    result = _nearest_neighbor_tsp(wps)
    assert result[0].lat == 12.0
    assert result[-1].lat == 13.0


def test_tsp_preserves_endpoints():
    wps = [
        GeoLocation(lat=12.0, lng=77.0),
        GeoLocation(lat=12.5, lng=77.5),
        GeoLocation(lat=12.2, lng=77.2),
        GeoLocation(lat=13.0, lng=78.0),
    ]
    result = _nearest_neighbor_tsp(wps)
    assert result[0].lat == 12.0
    assert result[-1].lat == 13.0
    assert len(result) == 4


def test_tsp_route_is_shorter_than_naive():
    wps = [
        GeoLocation(lat=12.0, lng=77.0),
        GeoLocation(lat=13.0, lng=78.5),
        GeoLocation(lat=12.1, lng=77.1),
        GeoLocation(lat=14.0, lng=79.0),
    ]
    optimized = _nearest_neighbor_tsp(wps)
    def total_dist(pts):
        return sum(_haversine_m(pts[i].lat, pts[i].lng, pts[i+1].lat, pts[i+1].lng) for i in range(len(pts)-1))
    assert total_dist(optimized) <= total_dist(wps) + 1  # +1 for float tolerance


def test_terrain_highway():
    response = client.post("/suggestions", json={"lat": 12.00, "lng": 77.00})
    assert response.status_code == 200
    assert "Highway Master" in response.json()["vehicle"]


def test_terrain_rough():
    response = client.post("/suggestions", json={"lat": 12.01, "lng": 77.00})
    assert response.status_code == 200
    assert "Scrambler" in response.json()["vehicle"]


def test_terrain_urban():
    response = client.post("/suggestions", json={"lat": 12.02, "lng": 77.00})
    assert response.status_code == 200
    assert "Urban Grid" in response.json()["vehicle"]


def test_suggestions_schema():
    response = client.post("/suggestions", json={"lat": 12.97, "lng": 77.59})
    data = response.json()
    assert "vehicle" in data
    assert "weather" in data
    assert "gear" in data
    assert isinstance(data["gear"], list)
    assert 0 <= data["safety_score"] <= 100


def test_weather_gear_calibration():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "main": {"temp": 28.0, "humidity": 55},
        "weather": [{"main": "Clear"}],
    }
    with patch("requests.get", return_value=mock_response):
        response = client.post("/suggestions", json={"lat": 12.97, "lng": 77.59})
    data = response.json()
    assert "Full-face Helmet" in data["gear"]


def test_telemetry_batch_accepted():
    payload = {
        "points": [
            {"lat": 12.97, "lng": 77.59, "speed_kmh": 45.0, "heading": 90.0, "accuracy": 5.0, "distance_walked_km": 0.5},
            {"lat": 12.971, "lng": 77.591, "speed_kmh": 47.0, "heading": 91.0, "accuracy": 4.5, "distance_walked_km": 0.6},
        ]
    }
    response = client.post("/telemetry/batch", json=payload)
    assert response.status_code == 204


def test_telemetry_batch_empty_rejected():
    response = client.post("/telemetry/batch", json={"points": []})
    assert response.status_code == 400


def test_route_optimize_tsp():
    payload = {
        "waypoints": [
            {"lat": 12.0, "lng": 77.0},
            {"lat": 13.0, "lng": 78.5},
            {"lat": 12.1, "lng": 77.1},
            {"lat": 14.0, "lng": 79.0},
        ]
    }
    response = client.post("/route/optimize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["waypoint_count"] == 4
    assert data["optimized"][0]["lat"] == 12.0
    assert data["optimized"][-1]["lat"] == 14.0


def test_response_performance():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "main": {"temp": 28.0, "humidity": 55},
        "weather": [{"main": "Clear"}],
    }
    with patch("requests.get", return_value=mock_response):
        t0 = time.perf_counter()
        client.post("/suggestions", json={"lat": 12.97, "lng": 77.59})
        elapsed_ms = (time.perf_counter() - t0) * 1000
    assert elapsed_ms < 500
