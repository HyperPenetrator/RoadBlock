import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractiveMap } from './InteractiveMap';
import { NavigationOverlay } from './NavigationOverlay';
import { BottomSheet } from './BottomSheet';
import { GhostSidebar } from './GhostSidebar';
import { RoutingService } from '../services/RoutingService';
import { GeocodingService } from '../services/GeocodingService';
import { trackingManager, LocationData } from '../services/TrackingManager';
import { useRouteStore } from '../store/RouteStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { AlertTriangle, WifiOff } from 'lucide-react';

const BATCH_INTERVAL_MS = 30_000;
const REROUTE_THRESHOLD_M = 30;
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:7860';

const MapView: React.FC = () => {
  const { geolocationStatus } = usePermissionStore();
  const routeStore = useRouteStore();

  const [currentLocation, setCurrentLocation] = useState<[number, number]>([12.9716, 77.5946]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const rerouteBlockRef = useRef(false);

  // Seed initial position from GPS
  useEffect(() => {
    if (navigator.geolocation && geolocationStatus === 'granted') {
      navigator.geolocation.getCurrentPosition(
        (p) => setCurrentLocation([p.coords.latitude, p.coords.longitude]),
        () => {}
      );
    }
  }, [geolocationStatus]);

  const flushTelemetryBatch = useCallback(async () => {
    const batch = routeStore.flushBatch();
    if (!batch.length) return;
    try {
      await fetch(`${API_BASE}/telemetry/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: batch }),
      });
    } catch {}
  }, []);

  const handleLocationUpdate = useCallback((data: LocationData) => {
    setCurrentLocation([data.lat, data.lng]);
    routeStore.setTelemetry(data);
    routeStore.appendToBatch(data);
    if (Date.now() - routeStore.lastBatchFlushMs >= BATCH_INTERVAL_MS) flushTelemetryBatch();

    if (routeStore.activeRoute && !rerouteBlockRef.current) {
      const deviated = trackingManager.deviatesFromRoute(data.lat, data.lng, routeStore.activeRoute, REROUTE_THRESHOLD_M);
      if (deviated) {
        rerouteBlockRef.current = true;
        routeStore.setIsRerouting(true);
        routeStore.setMissionStatus('REROUTING');
        const dest = routeStore.waypoints[routeStore.waypoints.length - 1];
        if (dest) {
          RoutingService.getRoute([[data.lat, data.lng], [dest.lat, dest.lng]])
            .then((res) => {
              routeStore.setActiveRoute(res.coordinates, res.distanceM, res.durationS);
              if (res.legs[0]?.steps[0]) routeStore.setNextTurn(res.legs[0].steps[0]);
              routeStore.setMissionStatus('TRACKING');
              routeStore.setIsRerouting(false);
            })
            .catch(() => { routeStore.setMissionStatus('TRACKING'); routeStore.setIsRerouting(false); })
            .finally(() => setTimeout(() => { rerouteBlockRef.current = false; }, 10_000));
        }
      }
    }
  }, [routeStore, flushTelemetryBatch]);

  const startMission = useCallback(async () => {
    // Auto-calculate route if waypoints exist but no route yet
    if (routeStore.waypoints.length && !routeStore.activeRoute?.length) {
      setIsLoadingRoute(true);
      routeStore.setMissionStatus('ROUTING');
      try {
        const pts: [number, number][] = [
          [...currentLocation],
          ...routeStore.waypoints.map((w): [number, number] => [w.lat, w.lng]),
        ];
        const res = await RoutingService.getRoute(pts);
        routeStore.setActiveRoute(res.coordinates, res.distanceM, res.durationS);
        if (res.legs[0]?.steps[0]) routeStore.setNextTurn(res.legs[0].steps[0]);
      } catch {
        setGpsError('Route calculation failed');
        routeStore.setMissionStatus('IDLE');
        setIsLoadingRoute(false);
        return;
      }
      setIsLoadingRoute(false);
    }

    routeStore.setMissionStatus('TRACKING');
    await trackingManager.startMission({
      onLocationUpdate: handleLocationUpdate,
      onError: (err) => {
        const msg: Record<number, string> = { 1: 'GPS Denied', 2: 'Signal Lost', 3: 'GPS Timeout' };
        setGpsError(msg[err.code] ?? 'GPS Error');
        routeStore.setMissionStatus('IDLE');
      },
    });
  }, [handleLocationUpdate, routeStore, currentLocation]);

  const pauseMission  = useCallback(() => { trackingManager.pauseMission(); routeStore.setMissionStatus('PAUSED'); }, [routeStore]);
  const resumeMission = useCallback(() => { trackingManager.resumeMission().then(() => routeStore.setMissionStatus('TRACKING')); }, [routeStore]);
  const stopMission   = useCallback(async () => {
    await trackingManager.stopMission();
    routeStore.setMissionStatus('IDLE');
    routeStore.setNextTurn(null);
    routeStore.setIsRerouting(false);
    routeStore.clearWaypoints();
    routeStore.setActiveRoute([], 0, 0);
    flushTelemetryBatch();
  }, [routeStore, flushTelemetryBatch]);

  useEffect(() => () => { trackingManager.stopMission(); }, []);

  const addWaypointBySearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await GeocodingService.search(searchQuery);
      if (!result) throw new Error();
      routeStore.addWaypoint({ id: crypto.randomUUID(), label: searchQuery, lat: result.lat, lng: result.lng });
      setSearchQuery('');
    } catch { setGpsError('Location not found'); }
    finally { setIsSearching(false); }
  }, [searchQuery, routeStore]);

  const fetchRoute = useCallback(async (optimized = false) => {
    if (!routeStore.waypoints.length) return;
    setIsLoadingRoute(true);
    routeStore.setMissionStatus('ROUTING');
    try {
      const pts: [number, number][] = [
        [...currentLocation],
        ...routeStore.waypoints.map((w): [number, number] => [w.lat, w.lng]),
      ];
      const res = optimized
        ? await RoutingService.getOptimizedRoute(pts)
        : await RoutingService.getRoute(pts);
      routeStore.setActiveRoute(res.coordinates, res.distanceM, res.durationS);
      if (res.legs[0]?.steps[0]) routeStore.setNextTurn(res.legs[0].steps[0]);
      routeStore.setMissionStatus('IDLE');
    } catch { setGpsError('No route found'); routeStore.setMissionStatus('IDLE'); }
    finally { setIsLoadingRoute(false); }
  }, [currentLocation, routeStore]);

  const handleMapClick = useCallback((latlng: [number, number]) => {
    routeStore.addWaypoint({
      id: crypto.randomUUID(),
      label: `${latlng[0].toFixed(4)}, ${latlng[1].toFixed(4)}`,
      lat: latlng[0], lng: latlng[1],
    });
  }, [routeStore]);

  const missionStatus = routeStore.missionStatus;
  // Enabled whenever IDLE — auto-routes if waypoints exist but no route yet
  const canEngage = missionStatus === 'IDLE';

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ background: '#080A12' }}>

      {/* Fullscreen map — z-0, TrackingManager never resets on view change */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap
          currentLocation={currentLocation}
          destinationCoords={
            routeStore.waypoints.length
              ? [routeStore.waypoints[routeStore.waypoints.length - 1].lat, routeStore.waypoints[routeStore.waypoints.length - 1].lng]
              : null
          }
          route={routeStore.activeRoute}
          currentHeading={routeStore.telemetry?.heading ?? 0}
          currentVelocity={routeStore.telemetry?.speed_kmh ?? 0}
          onMapClick={handleMapClick}
        />
      </div>

      {/* Signal strip + turn card — z-10, pointer-events-none except turn card */}
      <NavigationOverlay missionStatus={missionStatus} />


      {/* Snap bottom sheet — z-20 */}
      <BottomSheet
        missionStatus={missionStatus}
        canEngage={canEngage}
        onStart={startMission}
        onPause={pauseMission}
        onResume={resumeMission}
        onStop={stopMission}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={addWaypointBySearch}
        isSearching={isSearching}
        isLoadingRoute={isLoadingRoute}
        onFetchRoute={fetchRoute}
        onClearAll={() => { routeStore.clearWaypoints(); routeStore.setActiveRoute([], 0, 0); }}
      />

      {/* GPS error toast — z-50 */}
      <AnimatePresence>
        {gpsError && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setGpsError(null), 3000)}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl pointer-events-none"
            style={{ background: 'rgba(230,57,70,0.14)', border: '1px solid rgba(230,57,70,0.28)', backdropFilter: 'blur(16px)' }}
          >
            {gpsError.includes('Lost') || gpsError.includes('Timeout')
              ? <WifiOff className="w-4 h-4 text-[#E63946]" />
              : <AlertTriangle className="w-4 h-4 text-[#E63946]" />}
            <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-[#E63946] uppercase">{gpsError}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MapView;
