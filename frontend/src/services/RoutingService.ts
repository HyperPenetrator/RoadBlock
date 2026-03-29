import { TurnInstruction } from '../store/RouteStore';

export interface RouteResponse {
  coordinates: [number, number][];
  distanceM: number;
  durationS: number;
  legs: RouteLeg[];
}

export interface RouteLeg {
  distanceM: number;
  durationS: number;
  steps: TurnInstruction[];
}

type LatLng = [number, number];

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

const MANEUVER_MAP: Record<string, TurnInstruction['maneuver']> = {
  'turn left': 'turn-left',
  'turn right': 'turn-right',
  'straight': 'straight',
  'uturn': 'u-turn',
  'arrive': 'arrive',
  'depart': 'depart',
};

function parseManeuver(type: string, modifier: string): TurnInstruction['maneuver'] {
  const key = modifier ? `${type} ${modifier}` : type;
  return MANEUVER_MAP[key] ?? 'straight';
}

function haversineM(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const φ1 = (a[0] * Math.PI) / 180;
  const φ2 = (b[0] * Math.PI) / 180;
  const dφ = ((b[0] - a[0]) * Math.PI) / 180;
  const dλ = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function nearestNeighborTSP(waypoints: LatLng[]): LatLng[] {
  if (waypoints.length <= 2) return [...waypoints];
  const start = waypoints[0];
  const end = waypoints[waypoints.length - 1];
  const interior = [...waypoints.slice(1, -1)];
  const visited: boolean[] = new Array(interior.length).fill(false);
  const ordered: LatLng[] = [start];
  let current = start;
  for (let i = 0; i < interior.length; i++) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let j = 0; j < interior.length; j++) {
      if (visited[j]) continue;
      const d = haversineM(current, interior[j]);
      if (d < bestDist) { bestDist = d; bestIdx = j; }
    }
    if (bestIdx !== -1) {
      visited[bestIdx] = true;
      ordered.push(interior[bestIdx]);
      current = interior[bestIdx];
    }
  }
  ordered.push(end);
  return ordered;
}

export class RoutingService {
  static async getRoute(waypoints: LatLng[]): Promise<RouteResponse> {
    if (waypoints.length < 2) throw new Error('At least 2 waypoints required');
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM error: ${res.statusText}`);
    const data = await res.json();
    if (!data.routes?.length) throw new Error('No route found');
    const route = data.routes[0];
    const coordinates: LatLng[] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    const legs: RouteLeg[] = (route.legs ?? []).map((leg: any) => ({
      distanceM: leg.distance,
      durationS: leg.duration,
      steps: (leg.steps ?? []).map((step: any): TurnInstruction => ({
        maneuver: parseManeuver(step.maneuver?.type ?? 'straight', step.maneuver?.modifier ?? ''),
        distanceM: step.distance,
        streetName: step.name ?? '',
      })),
    }));
    return {
      coordinates,
      distanceM: route.distance,
      durationS: route.duration,
      legs,
    };
  }

  static async getOptimizedRoute(waypoints: LatLng[]): Promise<RouteResponse> {
    const optimized = nearestNeighborTSP(waypoints);
    return RoutingService.getRoute(optimized);
  }
}
