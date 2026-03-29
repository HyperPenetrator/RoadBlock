import { renderHook, act } from '@testing-library/react';
import { useSafetyStore } from '../store/useSafetyStore';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Feature B: Geolocation & State Management Validation
describe('Feature B: Geolocation & State Management', () => {
  
  beforeEach(() => {
    // Reset Zustand store before each test
    act(() => useSafetyStore.getState().resetScan());
    vi.clearAllMocks();
  });

  it('accurately captures and distributes mock geolocation state', async () => {
    const mockPos = {
      coords: {
        latitude: 19.0760,
        longitude: 72.8777
      },
      timestamp: Date.now()
    };

    // Mock global navigator geolocation
    const getCurrentPositionMock = vi.fn().mockImplementation((success: (pos: any) => void) => success(mockPos));
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: getCurrentPositionMock
      }
    });

    // Mock fetch for the suggestion API
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        vehicle: "Test Bike",
        weather: { temp: 30, condition: "Clear", humidity: 50 },
        gear: ["Helmet"],
        route_alerts: ["No alerts"],
        safety_score: 100
      })
    }));

    const { result } = renderHook(() => useSafetyStore());

    // Trigger scan
    await act(async () => {
      await result.current.fetchLocationAndScan();
    });

    // Validations
    expect(result.current.location).toEqual({ lat: 19.0760, lng: 72.8777 });
    expect(result.current.suggestions?.vehicle).toBe("Test Bike");
    expect(result.current.isScanning).toBe(false);
  });

  it('handles geolocation denial (Edge Case) gracefully', async () => {
    // Mock denial error
    const getCurrentPositionMock = vi.fn().mockImplementation((_: any, error: (err: any) => void) => error({
      code: 1,
      message: "User denied Geolocation"
    }));
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: getCurrentPositionMock
      }
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    }));

    const { result } = renderHook(() => useSafetyStore());

    await act(async () => {
      await result.current.fetchLocationAndScan();
    });

    // Validations: Should fall back to default grid coord (12.9716, 77.5946)
    // and show a specific error toast message
    // Note: The state updates asynchronously, so we must wait for the fallback logic
    expect(result.current.location).toEqual({ lat: 12.9716, lng: 77.5946 });
    expect(result.current.locationError).toBe('GPS Link Severed. Falling back to primary grid.');
  });

  it('prevents race conditions via AbortController on rapid clicks', async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ vehicle: "Final Bike" })
      }), 100);
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useSafetyStore());

    // Trigger multiple rapid clicks
    result.current.fetchLocationAndScan();
    result.current.fetchLocationAndScan();

    // Give microtasks time to execute so fetch requests actually fire
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verification: The first request should have its signal aborted
    const firstCallOptions = fetchMock.mock.calls[0][1];
    expect(firstCallOptions.signal.aborted).toBe(true);
  });
});
