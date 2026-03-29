from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
import math
import os
import random
import requests
import time

WEATHER_API_KEY = os.environ.get("WEATHER_API_KEY", "")

app = FastAPI(title="RoadFireWall X - Tactical API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────────────────────

class GeoLocation(BaseModel):
    lat: float
    lng: float

class WeatherInfo(BaseModel):
    temp: float
    condition: str
    humidity: int

class SafetySuggestion(BaseModel):
    vehicle: str
    weather: WeatherInfo
    gear: List[str]
    route_alerts: List[str]
    safety_score: int

class TelemetryPoint(BaseModel):
    lat: float
    lng: float
    speed_kmh: float
    heading: float
    accuracy: float
    distance_walked_km: float

class TelemetryBatch(BaseModel):
    points: List[TelemetryPoint]

class WaypointList(BaseModel):
    waypoints: List[GeoLocation] = Field(..., min_length=2, max_length=12)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearest_neighbor_tsp(waypoints: List[GeoLocation]) -> List[GeoLocation]:
    if len(waypoints) <= 2:
        return list(waypoints)
    start, end = waypoints[0], waypoints[-1]
    interior = list(waypoints[1:-1])
    visited = [False] * len(interior)
    ordered = [start]
    current = start
    for _ in range(len(interior)):
        best_idx, best_dist = -1, float("inf")
        for j, wp in enumerate(interior):
            if visited[j]:
                continue
            d = _haversine_m(current.lat, current.lng, wp.lat, wp.lng)
            if d < best_dist:
                best_dist, best_idx = d, j
        if best_idx != -1:
            visited[best_idx] = True
            ordered.append(interior[best_idx])
            current = interior[best_idx]
    ordered.append(end)
    return ordered


TERRAIN_MAP = {
    0: {"vehicle": "Stable 350cc Cruiser (Highway Master)", "alert": "High-velocity wind gusts expected on open straights."},
    1: {"vehicle": "Nimble Scrambler (Rough Terrain Optimized)", "alert": "Unpaved surfaces detected. Maintain steady throttle."},
    2: {"vehicle": "Agile Electric Commuter (Urban Grid)", "alert": "High stop-start density. Engage energy recovery mode."},
}

GEAR_TABLE = {
    "Clear": ["Full-face Helmet", "Riding Jacket", "Kevlar Gloves"],
    "Rain": ["Gore-Tex Waterproofs", "Anti-fog Pinlock", "Waterproof Boots"],
    "Clouds": ["ECE Helmet", "Textile Jacket", "Reflective Vest"],
    "Drizzle": ["Water-resistant Shell", "Clear Visor", "High-grip Gloves"],
}


# ── Mock Telemetry WebSocket ──────────────────────────────────────────────────

class _MockRider:
    def __init__(self, lat: float = 12.9716, lng: float = 77.5946):
        self.lat, self.lng = lat, lng
        self.speed = 0.0
        self.heading = 45.0
        self._dt = 0.5

    def tick(self) -> dict:
        self.speed = min(25.0, max(0.0, self.speed + 3.2 * self._dt + random.uniform(-0.4, 0.4)))
        dist = self.speed * self._dt
        self.lat += (dist * math.cos(math.radians(self.heading))) / 111_111
        self.lng += (dist * math.sin(math.radians(self.heading))) / (111_111 * math.cos(math.radians(self.lat)))
        return {
            "lat": round(self.lat, 7),
            "lng": round(self.lng, 7),
            "speed_kmh": round(self.speed * 3.6, 1),
            "heading": self.heading,
            "signal_strength": random.randint(85, 100),
        }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/telemetry")
async def telemetry_socket(websocket: WebSocket):
    await websocket.accept()
    rider = _MockRider()
    try:
        while True:
            await websocket.send_json(rider.tick())
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass


@app.post("/suggestions", response_model=SafetySuggestion)
async def get_suggestions(loc: GeoLocation):
    terrain_index = (int(round((loc.lat + loc.lng) * 100)) + 1) % 3
    match = TERRAIN_MAP[terrain_index]

    weather: dict = {"temp": 24.0, "condition": "Clear", "humidity": 50}
    if WEATHER_API_KEY:
        try:
            url = (
                f"https://api.openweathermap.org/data/2.5/weather"
                f"?lat={loc.lat}&lon={loc.lng}&appid={WEATHER_API_KEY}&units=metric"
            )
            r = requests.get(url, timeout=2)
            if r.status_code == 200:
                d = r.json()
                weather = {
                    "temp": d["main"]["temp"],
                    "condition": d["weather"][0]["main"],
                    "humidity": d["main"]["humidity"],
                }
        except Exception:
            pass

    safety_score = 98
    if weather["condition"] in ("Rain", "Thunderstorm"):
        safety_score -= 20

    return {
        "vehicle": match["vehicle"],
        "weather": weather,
        "gear": GEAR_TABLE.get(weather["condition"], ["Full Tactical Safety Suite"]),
        "route_alerts": [match["alert"], "Grid parity nominal within sensor range."],
        "safety_score": max(0, safety_score),
    }


@app.post("/telemetry/batch", status_code=204)
async def ingest_telemetry_batch(batch: TelemetryBatch):
    if not batch.points:
        raise HTTPException(status_code=400, detail="Empty batch")
    return None


@app.post("/route/optimize")
async def optimize_route(body: WaypointList):
    optimized = _nearest_neighbor_tsp(body.waypoints)
    return {
        "optimized": [{"lat": w.lat, "lng": w.lng} for w in optimized],
        "waypoint_count": len(optimized),
    }



# ── WebSocket telemetry stream (/ws/telemetry) — 5 Hz ───────────────────────

class _SimState:
    lat: float = 12.9716
    lng: float = 77.5946
    speed: float = 0.0
    heading: float = 45.0
    signal: float = 85.0

_sim = _SimState()

@app.websocket("/ws/telemetry")
async def ws_telemetry(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            _sim.speed   = max(0, min(160, _sim.speed + random.uniform(-4, 5)))
            _sim.heading = (_sim.heading + random.uniform(-2, 2)) % 360
            _sim.signal  = max(20, min(100, _sim.signal + random.uniform(-2, 2)))
            _sim.lat    += random.uniform(-0.00005, 0.00005) + math.cos(math.radians(_sim.heading)) * _sim.speed * 1e-6
            _sim.lng    += random.uniform(-0.00005, 0.00005) + math.sin(math.radians(_sim.heading)) * _sim.speed * 1e-6
            await ws.send_json({
                "lat":             round(_sim.lat,   6),
                "lng":             round(_sim.lng,   6),
                "speed_kmh":       round(_sim.speed, 2),
                "heading":         round(_sim.heading, 1),
                "signal_strength": round(_sim.signal,  1),
            })
            await asyncio.sleep(0.2)
    except WebSocketDisconnect:
        pass


# ── Static file serving ───────────────────────────────────────────────────────

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DIST_DIR = os.path.join(os.path.dirname(_BASE_DIR), "frontend", "dist")

if os.path.isdir(_DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_DIST_DIR, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    candidate = os.path.join(_DIST_DIR, full_path)
    if os.path.isfile(candidate):
        return FileResponse(candidate)
    index = os.path.join(_DIST_DIR, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return {"error": "Frontend build not found — run `npm run build` in /frontend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 7860)))
