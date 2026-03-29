import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw } from 'lucide-react';
import { useRouteStore, TurnInstruction, MissionStatus } from '../store/RouteStore';

interface NavigationOverlayProps {
  missionStatus: MissionStatus;
}

const MANEUVER_GLYPH: Record<TurnInstruction['maneuver'], string> = {
  'turn-left':  '↰',
  'turn-right': '↱',
  'straight':   '↑',
  'u-turn':     '↩',
  'arrive':     '⊙',
  'depart':     '▶',
};

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} M` : `${(m / 1000).toFixed(1)} KM`;
}

function fmtETA(distM: number, kmh: number): string {
  if (kmh < 1) return '--:--';
  const mins = Math.round((distM / 1000 / kmh) * 60);
  return mins < 60
    ? `${String(mins).padStart(2, '0')} MIN`
    : `${Math.floor(mins / 60)}H ${String(mins % 60).padStart(2, '0')}M`;
}

function signalColor(acc: number): string {
  if (acc < 10) return '#00FFD1';
  if (acc < 30) return '#EAB308';
  return '#EF4444';
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({ missionStatus }) => {
  const { telemetry, nextTurn, activeRouteDistanceM, isRerouting } = useRouteStore();

  const speedKmh = telemetry?.speed_kmh ?? 0;
  const accuracy = telemetry?.accuracy ?? 99;
  const sig      = signalColor(accuracy);
  const eta      = fmtETA(activeRouteDistanceM, speedKmh);
  const isTracking = missionStatus === 'TRACKING' || missionStatus === 'REROUTING';

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">

      {/* ── Top micro strip ──────────────────────────────── */}
      <div className="flex items-start justify-between px-5 pt-safe pt-10">
        <div className="flex items-center gap-2">
          <span
            className="block w-2 h-2 rounded-full"
            style={{ background: sig, boxShadow: `0 0 6px ${sig}, 0 0 12px ${sig}44` }}
          />
          <span className="font-mono text-[10px] font-bold tracking-[0.3em] opacity-35 text-white">GRD</span>
        </div>

        <AnimatePresence>
          {activeRouteDistanceM > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-baseline gap-1.5"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-white/28 uppercase">ETA</span>
              <span className="font-mono text-sm font-bold text-white/55">{eta}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Rerouting badge ──────────────────────────────── */}
      <div className="flex justify-center mt-4">
        <AnimatePresence>
          {isRerouting && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(234,179,8,0.13)', border: '1px solid rgba(234,179,8,0.28)' }}
            >
              <RotateCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
              <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-yellow-400 uppercase">Rerouting</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Turn-by-turn (floats above bottom sheet) ─────── */}
      <div className="flex-1 flex flex-col justify-end px-4 pb-36">
        <AnimatePresence mode="wait">
          {nextTurn && isTracking && (
            <motion.div
              key={nextTurn.streetName + nextTurn.distanceM}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: 'rgba(0,255,209,0.08)',
                border: '1px solid rgba(0,255,209,0.15)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <span className="text-xl text-[#00FFD1] font-mono font-bold leading-none" aria-hidden>
                {MANEUVER_GLYPH[nextTurn.maneuver]}
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] font-bold tracking-[0.3em] text-[#00FFD1]/55 uppercase">
                  {fmtDist(nextTurn.distanceM)}
                </span>
                <span className="font-mono text-xs font-bold text-white truncate max-w-[200px]">
                  {nextTurn.streetName || 'Continue'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
