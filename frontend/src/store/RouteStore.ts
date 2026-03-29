import { create } from 'zustand';
import { LocationData } from '../services/TrackingManager';

export type MissionStatus = 'IDLE' | 'ROUTING' | 'TRACKING' | 'PAUSED' | 'REROUTING';

export interface Waypoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface TurnInstruction {
  maneuver: 'straight' | 'turn-left' | 'turn-right' | 'u-turn' | 'arrive' | 'depart';
  distanceM: number;
  streetName: string;
}

interface RouteState {
  waypoints: Waypoint[];
  activeRoute: [number, number][] | null;
  activeRouteDistanceM: number;
  activeRouteDurationS: number;
  currentLeg: number;
  telemetry: LocationData | null;
  missionStatus: MissionStatus;
  nextTurn: TurnInstruction | null;
  isRerouting: boolean;
  telemetryBatch: LocationData[];
  lastBatchFlushMs: number;

  addWaypoint: (wp: Waypoint) => void;
  removeWaypoint: (id: string) => void;
  reorderWaypoints: (waypoints: Waypoint[]) => void;
  clearWaypoints: () => void;
  setActiveRoute: (coords: [number, number][], distanceM: number, durationS: number) => void;
  setMissionStatus: (status: MissionStatus) => void;
  setTelemetry: (data: LocationData) => void;
  setNextTurn: (turn: TurnInstruction | null) => void;
  setIsRerouting: (val: boolean) => void;
  appendToBatch: (data: LocationData) => void;
  flushBatch: () => LocationData[];
  reset: () => void;
}

const EMPTY_STATE = {
  waypoints: [] as Waypoint[],
  activeRoute: null,
  activeRouteDistanceM: 0,
  activeRouteDurationS: 0,
  currentLeg: 0,
  telemetry: null,
  missionStatus: 'IDLE' as MissionStatus,
  nextTurn: null,
  isRerouting: false,
  telemetryBatch: [] as LocationData[],
  lastBatchFlushMs: Date.now(),
};

export const useRouteStore = create<RouteState>((set, get) => ({
  ...EMPTY_STATE,

  addWaypoint: (wp) =>
    set((s) => ({ waypoints: [...s.waypoints, wp] })),

  removeWaypoint: (id) =>
    set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) })),

  reorderWaypoints: (waypoints) => set({ waypoints }),

  clearWaypoints: () => set({ waypoints: [] }),

  setActiveRoute: (coords, distanceM, durationS) =>
    set({ activeRoute: coords, activeRouteDistanceM: distanceM, activeRouteDurationS: durationS }),

  setMissionStatus: (status) => set({ missionStatus: status }),

  setTelemetry: (data) => set({ telemetry: data }),

  setNextTurn: (turn) => set({ nextTurn: turn }),

  setIsRerouting: (val) => set({ isRerouting: val }),

  appendToBatch: (data) =>
    set((s) => ({ telemetryBatch: [...s.telemetryBatch, data] })),

  flushBatch: () => {
    const batch = get().telemetryBatch;
    set({ telemetryBatch: [], lastBatchFlushMs: Date.now() });
    return batch;
  },

  reset: () => set({ ...EMPTY_STATE }),
}));
