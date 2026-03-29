'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Satellite, ShieldCheck, CircleUser, Settings, Target, Navigation2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTelemetryStore, ConnectionStatus } from '../store/useTelemetryStore';
import { useTelemetryWebSocket } from '../hooks/useTelemetryWebSocket';

function haptic(ms = 15) { if ('vibrate' in navigator) navigator.vibrate(ms); }

// ── Animated SVG pulse wave (direct DOM — zero React re-renders) ──────────────
const PulseWave: React.FC<{ velocity: number }> = ({ velocity }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const phaseRef = useRef(0);
  const velRef = useRef(velocity);
  useEffect(() => { velRef.current = velocity; }, [velocity]);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const v = velRef.current;
      phaseRef.current += 0.055 + v * 0.0013;
      const amp = Math.min(10, 1.8 + v * 0.075);
      const freq = 0.09 + v * 0.0009;
      let d = '';
      for (let i = 0; i <= 64; i++) {
        const x = (i / 64) * 220;
        const y = 14 + amp * Math.sin(i * freq + phaseRef.current);
        d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)} `;
      }
      if (pathRef.current) pathRef.current.setAttribute('d', d);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <svg width="100%" height="28" viewBox="0 0 220 28" preserveAspectRatio="none" aria-hidden>
      <path ref={pathRef} fill="none" stroke="#00D1FF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

// ── Coordinate line overlay — moves slowly with lat/lng ──────────────────────
const CoordGrid: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const INTERVAL = 0.008;
  const xOff = ((Math.abs(lng) % INTERVAL) / INTERVAL) * 100;
  const yOff = ((Math.abs(lat) % INTERVAL) / INTERVAL) * 100;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={`h${i}`} className="absolute left-0 right-0" style={{ top: `${(yOff + i * 20) % 100}%`, height: 1, background: 'rgba(0,209,255,0.07)', transition: 'top 1.2s linear' }} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={`v${i}`} className="absolute top-0 bottom-0" style={{ left: `${(xOff + i * 20) % 100}%`, width: 1, background: 'rgba(0,209,255,0.07)', transition: 'left 1.2s linear' }} />
      ))}
    </div>
  );
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<ConnectionStatus, { label: string; color: string; glow: string; blink: boolean }> = {
  CONNECTING:  { label: 'Establishing Link...', color: '#F97316', glow: '0 0 8px #F9731660',  blink: false },
  CALIBRATING: { label: 'Calibrating Coords...', color: '#EF4444', glow: '0 0 8px #EF444460', blink: true  },
  ACTIVE_SYNC: { label: 'LIVE · Active Sync',  color: '#00FFD1', glow: '0 0 10px #00FFD140', blink: false },
  LOST:        { label: 'Link Lost — Retry...',  color: '#EF4444', glow: '0 0 8px #EF444440', blink: false },
};

function signalColor(s: number): string {
  if (s >= 70) return '#00FFD1';
  if (s >= 40) return '#EAB308';
  return '#EF4444';
}



// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  useTelemetryWebSocket();

  const navigate = useNavigate();
  const { pathname } = useLocation();

  const status = useTelemetryStore((s) => s.status);
  const velocity = useTelemetryStore((s) => s.smoothedVelocityKmh);
  const signalStrength = useTelemetryStore((s) => s.signalStrength);
  const heading = useTelemetryStore((s) => s.heading);
  const distKm = useTelemetryStore((s) => s.distanceTraveledKm);
  const lat = useTelemetryStore((s) => s.lat);
  const lng = useTelemetryStore((s) => s.lng);

  const cfg = STATUS_CFG[status];
  const sigColor = signalColor(signalStrength);

  const speedInt = Math.round(velocity);
  const speedStr = String(speedInt).padStart(3, '0');

  return (
    <div
      id="dashboard-root"
      className="flex flex-col w-screen h-[100svh] overflow-hidden select-none relative"
      style={{
        background: '#04060A',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col w-full max-w-lg mx-auto px-5 pt-8 pb-4 shrink-0 pointer-events-none">
        <div className="flex items-start justify-between pointer-events-auto">
          {/* Status Card */}
          <div
            className="px-4 py-3 rounded-2xl"
            style={{ background: 'rgba(10,12,22,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 32px rgba(0,0,0,0.28)' }}
          >
            <p className="font-mono text-[9px] font-bold tracking-[0.38em] text-[#E63946] uppercase mb-1.5">Grid Alpha Tracking</p>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: cfg.blink ? [1, 0.2, 1] : 1 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Satellite
                  style={{ width: 14, height: 14, color: cfg.color, filter: `drop-shadow(${cfg.glow})` }}
                />
              </motion.div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={status}
                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.2 }}
                  className="font-mono text-[12px] font-bold"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Target → navigate to live map */}
          <button
            id="btn-open-map"
            aria-label="Open Navigator"
            onClick={() => { haptic(20); navigate('/map'); }}
            className="flex items-center justify-center rounded-full active:scale-90 transition-transform"
            style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#E63946,#C1121F)', boxShadow: '0 4px 20px rgba(230,57,70,0.45)' }}
          >
            <Target style={{ width: 22, height: 22, color: '#fff' }} />
          </button>
        </div>
      </div>

      {/* ── Tactical Area ────────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden pointer-events-none">
        <CoordGrid lat={lat} lng={lng} />

        {/* Center stat cluster */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
          {/* Heading compass ring */}
          <motion.div
             animate={{ rotate: heading }}
             transition={{ type: 'spring', stiffness: 60, damping: 18 }}
             className="flex items-center justify-center relative"
             style={{ width: 100, height: 100, borderRadius: '50%', border: '1.5px solid rgba(0,209,255,0.22)', background: 'rgba(0,15,30,0.45)', backdropFilter: 'blur(12px)', boxShadow: 'inset 0 0 20px rgba(0,209,255,0.1)' }}
          >
             <Navigation2 style={{ width: 36, height: 36, color: '#00D1FF', filter: 'drop-shadow(0 0 10px #00D1FF)' }} />
          </motion.div>

          {/* Heading label */}
          <p className="font-mono text-[11px] font-bold tracking-[0.3em] text-[#00D1FF]/50 uppercase">
             {Math.round(heading)}° · {distKm.toFixed(2)} KM
          </p>
        </div>

        {/* Signal badge — top-right of tactical area */}
        <div className="absolute top-3 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="block w-2 h-2 rounded-full" style={{ background: sigColor, boxShadow: `0 0 8px ${sigColor}` }} />
          <span className="font-mono text-[10px] font-bold tracking-[0.28em] text-white/50 uppercase">SIG {signalStrength}%</span>
        </div>

        {/* Lat/Lng whisper */}
        {lat !== 0 && (
          <div className="absolute bottom-3 left-5 font-mono text-[9px] font-bold tracking-[0.22em] text-white/20 uppercase">
            {lat.toFixed(4)}N · {lng.toFixed(4)}E
          </div>
        )}
      </div>

      {/* ── Velocity Widget ──────────────────────────────────────────── */}
      <div className="shrink-0 w-full max-w-lg mx-auto mb-6 px-4">
        <div className="relative px-5 py-4 rounded-3xl" style={{ background: 'rgba(6,8,20,0.94)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 -4px 32px rgba(0,0,0,0.18)' }}>
          {/* Scanline */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden" style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.013) 3px,rgba(255,255,255,0.013) 4px)' }} />

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold tracking-[0.38em] text-[#00D1FF] uppercase">Velocity Scan</span>
              <span className="font-mono text-[9px] font-bold tracking-[0.25em] text-white/25">WMA·5</span>
            </div>

            {/* Large digits */}
            <div className="flex items-end gap-3 mb-3">
              <AnimatePresence mode="wait">
                <motion.span
                  key={speedInt}
                  initial={{ opacity: 0.5, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0.5, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="font-mono font-black tabular-nums leading-none"
                  style={{ fontSize: 52, color: '#FFFFFF', letterSpacing: '-0.02em', textShadow: '0 0 30px rgba(0,255,209,0.22)' }}
                  aria-live="polite"
                  aria-label={`${speedInt} kilometers per hour`}
                >
                  {speedStr}
                </motion.span>
              </AnimatePresence>
              <span className="font-mono text-xs font-bold tracking-[0.35em] text-[#00D1FF]/60 mb-3 uppercase">Km/H</span>
            </div>

            {/* RAF waveform — zero re-renders */}
            <div style={{ marginLeft: -4, marginRight: -4 }}>
              <PulseWave velocity={velocity} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
