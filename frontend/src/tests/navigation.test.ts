import { describe, it, expect, vi } from 'vitest';
import { RoutingService } from '../services/RoutingService';
import { MockLocationService } from '../services/MockLocationService';

describe('Mission Navigation Services', () => {

  describe('RoutingService', () => {
    it('parses OSRM response into tactical coordinates', async () => {
      const mockResponse = {
        routes: [{
          geometry: { coordinates: [[77.5946, 12.9716], [77.6000, 12.9800]] },
          distance: 1500,
          duration: 300,
          legs: [{ distance: 1500, duration: 300, steps: [] }],
        }],
      };

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }));

      const route = await RoutingService.getRoute([[12.9716, 77.5946], [12.9800, 77.6000]]);

      // OSRM returns [lng, lat] — we normalise to [lat, lng] for Leaflet
      expect(route.coordinates[0]).toEqual([12.9716, 77.5946]);
      expect(route.coordinates[1]).toEqual([12.9800, 77.6000]);
      expect(route.distanceM).toBe(1500);
    });

    it('throws when no route is returned', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ routes: [] }),
      }));

      await expect(
        RoutingService.getRoute([[0, 0], [1, 1]])
      ).rejects.toThrow('No route found');
    });
  });

  describe('MockLocationService', () => {
    it('simulates movement along a coordinate sequence', async () => {
      vi.useFakeTimers();
      const path: [number, number][] = [[1, 1], [2, 2], [3, 3]];
      const callback = vi.fn();

      const service = new MockLocationService(path, callback);
      service.start(100);

      expect(callback).toHaveBeenCalledWith([1, 1]);

      await vi.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledWith([2, 2]);

      await vi.advanceTimersByTimeAsync(100);
      expect(callback).toHaveBeenCalledWith([3, 3]);

      vi.useRealTimers();
    });
  });
});
