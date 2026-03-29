import React, { useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Search, Plus, Trash2, Shuffle, LayoutDashboard } from 'lucide-react';
import { useRouteStore, MissionStatus } from '../store/RouteStore';
import { useUIStore, SheetSnap } from '../store/useUIStore';

interface BottomSheetProps {
  missionStatus: MissionStatus;
  canEngage: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  isSearching: boolean;
  isLoadingRoute: boolean;
  onFetchRoute: (optimized?: boolean) => void;
  onClearAll: () => void;
}

function haptic(ms = 12) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  missionStatus,
  canEngage,
  onStart, onPause, onResume, onStop,
  searchQuery, onSearchChange, onSearchSubmit,
  isSearching, isLoadingRoute,
  onFetchRoute, onClearAll,
}) => {
  const routeStore = useRouteStore();
  const { sheetSnap, setSheetSnap } = useUIStore();
  const y = useMotionValue(0);
  const panStartY = useRef(0);

  const SNAPS = useMemo(() => {
    const h = window.innerHeight;
    return [h - 112, Math.round(h * 0.48), 52] as const;
  }, []);

  // Sync motion value to snap whenever snap changes from outside (e.g. back button)
  useEffect(() => {
    animate(y, SNAPS[sheetSnap], { type: 'spring', stiffness: 480, damping: 42 });
  }, [sheetSnap, SNAPS]);

  // Initialize to closed
  useEffect(() => { y.set(SNAPS[0]); }, []);

  // Android hardware back button
  useEffect(() => {
    const handler = () => {
      if (sheetSnap > 0) { setSheetSnap((sheetSnap - 1) as SheetSnap); haptic(); }
    };
    document.addEventListener('backbutton', handler);
    return () => document.removeEventListener('backbutton', handler);
  }, [sheetSnap, setSheetSnap]);

  const snapTo = useCallback((target: SheetSnap) => {
    setSheetSnap(target);
    animate(y, SNAPS[target], { type: 'spring', stiffness: 480, damping: 42 });
    haptic();
  }, [SNAPS, setSheetSnap, y]);

  const onHandlePanStart = useCallback(() => {
    panStartY.current = y.get();
  }, [y]);

  const onHandlePan = useCallback((_: PointerEvent, info: { delta: { y: number } }) => {
    const next = Math.max(SNAPS[2], Math.min(SNAPS[0], y.get() + info.delta.y));
    y.set(next);
  }, [SNAPS, y]);

  const onHandlePanEnd = useCallback((_: PointerEvent, info: { velocity: { y: number } }) => {
    const vy = info.velocity.y;
    const cur = y.get();

    let target: SheetSnap;
    if (vy > 600)       target = sheetSnap > 0 ? (sheetSnap - 1) as SheetSnap : 0;
    else if (vy < -600) target = sheetSnap < 2 ? (sheetSnap + 1) as SheetSnap : 2;
    else {
      const dists = SNAPS.map((s) => Math.abs(cur - s)) as [number, number, number];
      target = (dists.indexOf(Math.min(...dists))) as SheetSnap;
    }
    snapTo(target);
  }, [SNAPS, sheetSnap, snapTo, y]);

  const isTracking = missionStatus === 'TRACKING' || missionStatus === 'REROUTING';
  const isPaused   = missionStatus === 'PAUSED';
  const isRouting  = missionStatus === 'ROUTING'; // auto-route before start
  const hasRoute   = !!routeStore.activeRoute?.length;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      <motion.div
        style={{ y, position: 'absolute', left: 0, right: 0, top: 0, bottom: -100 }}
        className="pointer-events-none"
      >
        {/* Sheet card */}
        <div
          className="absolute left-0 right-0 top-0 pointer-events-auto overflow-hidden"
          style={{ height: '200vh', background: 'rgba(6,8,16,0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderRadius: '32px 32px 0 0', borderTop: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 -12px 80px rgba(0,0,0,0.7)' }}
        >
          {/* Scanline */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.014) 3px,rgba(255,255,255,0.014) 4px)' }} />

          {/* ── Handle drag zone ───────────────────────────── */}
          <motion.div
            className="relative z-10 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
            onPanStart={onHandlePanStart}
            onPan={onHandlePan as any}
            onPanEnd={onHandlePanEnd as any}
          >
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
          </motion.div>

          {/* ── Snap-0: Action cluster ───────────────────────── */}
          <div className="relative z-10 flex items-center justify-center gap-4 px-6 pb-4">
            <AnimatePresence mode="wait">
              {/* IDLE or ROUTING (auto-calculating before start) */}
              {!isTracking && !isPaused && (
                <motion.button
                  key="engage"
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  onClick={onStart}
                  disabled={!canEngage || isRouting}
                  aria-label="Engage"
                  className="flex items-center justify-center rounded-full active:scale-90 transition-transform disabled:opacity-50"
                  style={{
                    width: 76, height: 76,
                    background: 'radial-gradient(circle at 35% 35%,rgba(0,255,209,0.24),rgba(0,180,216,0.09))',
                    border: '2px solid rgba(0,255,209,0.5)',
                    boxShadow: '0 0 28px rgba(0,255,209,0.28),0 0 56px rgba(0,255,209,0.1),inset 0 1px 0 rgba(0,255,209,0.18)',
                  }}
                >
                  {isRouting
                    ? <span className="block w-6 h-6 border-2 border-[#00FFD1]/30 border-t-[#00FFD1] rounded-full animate-spin" />
                    : <Play style={{ width: 30, height: 30, color: '#00FFD1', fill: '#00FFD1', marginLeft: 3 }} />}
                </motion.button>
              )}

              {/* PAUSED */}
              {isPaused && (
                <motion.div key="paused" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-4">
                  <button onClick={onResume} aria-label="Resume" className="flex items-center justify-center rounded-full active:scale-90" style={{ width: 76, height: 76, background: 'radial-gradient(circle at 35% 35%,rgba(0,255,209,0.22),rgba(0,180,216,0.08))', border: '2px solid rgba(0,255,209,0.45)', boxShadow: '0 0 24px rgba(0,255,209,0.22)' }}>
                    <Play style={{ width: 28, height: 28, color: '#00FFD1', fill: '#00FFD1', marginLeft: 3 }} />
                  </button>
                  <button onClick={onStop} aria-label="Stop" className="flex items-center justify-center rounded-full active:scale-90" style={{ width: 56, height: 56, background: 'rgba(230,57,70,0.1)', border: '1.5px solid rgba(230,57,70,0.35)' }}>
                    <Square style={{ width: 20, height: 20, color: '#E63946', fill: '#E63946' }} />
                  </button>
                </motion.div>
              )}

              {/* TRACKING */}
              {isTracking && (
                <motion.div key="tracking" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex items-center gap-4">
                  <button onClick={onPause} aria-label="Pause" className="flex items-center justify-center rounded-full active:scale-90" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                    <Pause style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.65)' }} />
                  </button>
                  <button onClick={onStop} aria-label="Stop" className="flex items-center justify-center rounded-full active:scale-90" style={{ width: 76, height: 76, background: 'radial-gradient(circle at 35% 35%,rgba(230,57,70,0.22),rgba(230,57,70,0.08))', border: '2px solid rgba(230,57,70,0.5)', boxShadow: '0 0 24px rgba(230,57,70,0.22)' }}>
                    <Square style={{ width: 24, height: 24, color: '#E63946', fill: '#E63946' }} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Open sheet FAB */}
            {sheetSnap === 0 && (
              <button
                onClick={() => snapTo(1)}
                aria-label="Open waypoints"
                className="absolute right-7 flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span className="font-mono text-[8px] font-bold tracking-[0.3em] text-[#00D1FF]/60 uppercase">WPT</span>
              </button>
            )}

            {/* Collapse FAB when sheet is open */}
            {sheetSnap > 0 && hasRoute && (
              <button
                onClick={() => snapTo(0)}
                aria-label="Return to HUD"
                className="absolute right-7 flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
              >
                <LayoutDashboard style={{ width: 18, height: 18, color: '#00FFD1' }} />
                <span className="font-mono text-[8px] font-bold tracking-[0.3em] text-[#00FFD1]/60 uppercase">HUD</span>
              </button>
            )}
          </div>

          {/* ── Snap-1/2: Waypoint manager content ─────────── */}
          <AnimatePresence>
            {sheetSnap >= 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 px-5 pb-2 space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[10px] font-bold tracking-[0.35em] text-white/35 uppercase">Waypoints</span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-[#00FFD1]/55">{routeStore.waypoints.length}/12</span>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Search className="w-4 h-4 text-white/25 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearchSubmit()}
                    placeholder="Search destination..."
                    className="flex-1 bg-transparent font-mono text-sm text-white placeholder-white/18 outline-none"
                  />
                  <button
                    onClick={onSearchSubmit}
                    disabled={isSearching}
                    aria-label="Add waypoint"
                    className="w-7 h-7 flex items-center justify-center rounded-xl disabled:opacity-35"
                    style={{ background: 'rgba(0,255,209,0.13)', border: '1px solid rgba(0,255,209,0.28)' }}
                  >
                    {isSearching
                      ? <span className="w-3 h-3 border border-[#00FFD1]/40 border-t-[#00FFD1] rounded-full animate-spin block" />
                      : <Plus className="w-3.5 h-3.5 text-[#00FFD1]" />}
                  </button>
                </div>

                {/* Waypoint list */}
                <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: sheetSnap === 2 ? '34vh' : '18vh' }}>
                  {routeStore.waypoints.map((wp, i) => (
                    <motion.div
                      key={wp.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.055)' }}
                    >
                      <span className="font-mono text-[9px] font-bold text-[#00D1FF]/55 w-4 text-center tabular-nums">{i + 1}</span>
                      <p className="font-mono text-xs text-white/65 flex-1 truncate">{wp.label}</p>
                      <button onClick={() => routeStore.removeWaypoint(wp.id)} aria-label="Remove" className="text-[#E63946]/50 hover:text-[#E63946] transition-colors active:scale-90">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                  {!routeStore.waypoints.length && (
                    <p className="font-mono text-[10px] text-white/18 text-center py-5 tracking-[0.3em] uppercase">Tap map · search · or swipe up</p>
                  )}
                </div>

                {/* Management bar — single row */}
                <div className="flex gap-2 pt-1 pb-1">
                  <button
                    onClick={() => { onFetchRoute(false); snapTo(0); }}
                    disabled={!routeStore.waypoints.length || isLoadingRoute}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-mono text-[11px] font-bold tracking-[0.28em] uppercase text-black disabled:opacity-28 active:scale-95 transition-all"
                    style={{ background: routeStore.activeRoute?.length ? '#00FFD1' : '#00FFD1' }}
                  >
                    {isLoadingRoute
                      ? <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      : routeStore.activeRoute?.length ? 'RESUME HUD' : 'ROUTE'}
                  </button>
                  <button
                    onClick={() => onFetchRoute(true)}
                    disabled={routeStore.waypoints.length < 3 || isLoadingRoute}
                    aria-label="Optimize (TSP)"
                    className="flex items-center justify-center px-4 py-4 rounded-2xl disabled:opacity-18 active:scale-95 transition-all"
                    style={{ background: 'rgba(0,255,209,0.08)', border: '1px solid rgba(0,255,209,0.2)' }}
                  >
                    <Shuffle className="w-4 h-4 text-[#00FFD1]" />
                  </button>
                  <button
                    onClick={onClearAll}
                    aria-label="Clear all"
                    className="flex items-center justify-center px-4 py-4 rounded-2xl active:scale-95 transition-all"
                    style={{ background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.18)' }}
                  >
                    <Trash2 className="w-4 h-4 text-[#E63946]/65" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
