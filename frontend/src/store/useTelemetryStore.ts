import { create } from 'zustand';

export type ConnectionStatus = 'CONNECTING' | 'CALIBRATING' | 'ACTIVE_SYNC' | 'LOST';

export interface WsFrame {
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  signal_strength: number;
}

const WMA_WEIGHTS = [0.08, 0.12, 0.18, 0.26, 0.36] as const;

function weightedSmooth(history: number[], next: number): { smooth: number; history: number[] } {
  const h = [...history.slice(-(WMA_WEIGHTS.length - 1)), next];
  const w = WMA_WEIGHTS.slice(WMA_WEIGHTS.length - h.length);
  const wSum = w.reduce((a, b) => a + b, 0);
  return { smooth: h.reduce((acc, v, i) => acc + v * w[i], 0) / wSum, history: h };
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TelemetryState {
  status: ConnectionStatus;
  rawVelocityKmh: number;
  smoothedVelocityKmh: number;
  heading: number;
  lat: number;
  lng: number;
  signalStrength: number;
  distanceTraveledKm: number;
  frameCount: number;
  _velocityHistory: number[];
  _prevLat: number;
  _prevLng: number;
  setStatus: (s: ConnectionStatus) => void;
  ingest: (frame: WsFrame) => void;
  reset: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  status: 'CONNECTING',
  rawVelocityKmh: 0,
  smoothedVelocityKmh: 0,
  heading: 0,
  lat: 0,
  lng: 0,
  signalStrength: 0,
  distanceTraveledKm: 0,
  frameCount: 0,
  _velocityHistory: [],
  _prevLat: 0,
  _prevLng: 0,

  setStatus: (status) => set({ status }),

  ingest: (frame) => {
    const state = get();
    const { smooth, history } = weightedSmooth(state._velocityHistory, frame.speed_kmh);

    const prevLat = state._prevLat || frame.lat;
    const prevLng = state._prevLng || frame.lng;
    const segmentKm = haversineKm(prevLat, prevLng, frame.lat, frame.lng);

    const newFrameCount = state.frameCount + 1;
    const newStatus: ConnectionStatus = newFrameCount >= 5 ? 'ACTIVE_SYNC' : 'CALIBRATING';

    set({
      rawVelocityKmh: frame.speed_kmh,
      smoothedVelocityKmh: smooth,
      heading: frame.heading,
      lat: frame.lat,
      lng: frame.lng,
      signalStrength: frame.signal_strength,
      distanceTraveledKm: state.distanceTraveledKm + segmentKm,
      frameCount: newFrameCount,
      status: newStatus,
      _velocityHistory: history,
      _prevLat: frame.lat,
      _prevLng: frame.lng,
    });
  },

  reset: () => set({
    status: 'CONNECTING', rawVelocityKmh: 0, smoothedVelocityKmh: 0,
    heading: 0, lat: 0, lng: 0, signalStrength: 0,
    distanceTraveledKm: 0, frameCount: 0,
    _velocityHistory: [], _prevLat: 0, _prevLng: 0,
  }),
}));
