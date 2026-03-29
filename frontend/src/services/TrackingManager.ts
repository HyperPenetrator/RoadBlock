export interface TrackingOptions {
  onLocationUpdate: (location: LocationData) => void;
  onError?: (error: GeolocationPositionError) => void;
}

export interface LocationData {
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  accuracy: number;
  distance_walked_km: number;
}

interface KalmanState {
  lat: number;
  lng: number;
  variance: number;
}

class TrackingManager {
  private static _instance: TrackingManager;
  private watchId: number | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private kalman: KalmanState | null = null;
  private readonly Q_METERS_PER_SECOND = 3;
  private lastTimestampMs: number | null = null;
  private totalDistanceKm = 0;
  private lastFixedLat: number | null = null;
  private lastFixedLng: number | null = null;
  private onLocationUpdate: ((d: LocationData) => void) | null = null;
  private onError: ((e: GeolocationPositionError) => void) | null = null;

  public state: 'IDLE' | 'TRACKING' | 'PAUSED' = 'IDLE';

  static getInstance(): TrackingManager {
    if (!TrackingManager._instance) TrackingManager._instance = new TrackingManager();
    return TrackingManager._instance;
  }

  async startMission(options: TrackingOptions): Promise<void> {
    if (this.state === 'TRACKING') return;
    this.onLocationUpdate = options.onLocationUpdate;
    this.onError = options.onError ?? null;
    this.state = 'TRACKING';
    await this._acquireWakeLock();
    this.watchId = navigator.geolocation.watchPosition(
      this._handlePosition.bind(this),
      this._handleError.bind(this),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  pauseMission(): void {
    if (this.state !== 'TRACKING') return;
    this.state = 'PAUSED';
    this._clearWatch();
  }

  async resumeMission(): Promise<void> {
    if (this.state !== 'PAUSED') return;
    this.state = 'TRACKING';
    await this._acquireWakeLock();
    this.watchId = navigator.geolocation.watchPosition(
      this._handlePosition.bind(this),
      this._handleError.bind(this),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  async stopMission(): Promise<void> {
    this.state = 'IDLE';
    this._clearWatch();
    this.kalman = null;
    this.lastTimestampMs = null;
    this.totalDistanceKm = 0;
    this.lastFixedLat = null;
    this.lastFixedLng = null;
    await this._releaseWakeLock();
  }

  deviatesFromRoute(
    lat: number,
    lng: number,
    routeCoords: [number, number][],
    thresholdM = 30
  ): boolean {
    if (!routeCoords.length) return false;
    const minDist = routeCoords.reduce((min, [rlat, rlng]) => {
      const d = this._haversineM(lat, lng, rlat, rlng);
      return d < min ? d : min;
    }, Infinity);
    return minDist > thresholdM;
  }

  haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return this._haversineM(lat1, lon1, lat2, lon2) / 1000;
  }

  private _haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private _kalmanUpdate(lat: number, lng: number, accuracy: number, timestampMs: number): [number, number] {
    if (!this.kalman) {
      this.kalman = { lat, lng, variance: accuracy * accuracy };
      this.lastTimestampMs = timestampMs;
      return [lat, lng];
    }
    const dtSec = Math.max((timestampMs - (this.lastTimestampMs ?? timestampMs)) / 1000, 0);
    this.lastTimestampMs = timestampMs;
    const processNoise = this.Q_METERS_PER_SECOND * dtSec;
    this.kalman.variance += processNoise * processNoise;
    const K = this.kalman.variance / (this.kalman.variance + accuracy * accuracy);
    this.kalman.lat += K * (lat - this.kalman.lat);
    this.kalman.lng += K * (lng - this.kalman.lng);
    this.kalman.variance *= 1 - K;
    return [this.kalman.lat, this.kalman.lng];
  }

  private _handlePosition(position: GeolocationPosition): void {
    if (this.state !== 'TRACKING') return;
    const { latitude, longitude, speed, heading, accuracy } = position.coords;
    const [sLat, sLng] = this._kalmanUpdate(latitude, longitude, accuracy, position.timestamp);
    if (this.lastFixedLat !== null && this.lastFixedLng !== null) {
      const distM = this._haversineM(this.lastFixedLat, this.lastFixedLng, sLat, sLng);
      if (distM > 1) {
        this.totalDistanceKm += distM / 1000;
        this.lastFixedLat = sLat;
        this.lastFixedLng = sLng;
      }
    } else {
      this.lastFixedLat = sLat;
      this.lastFixedLng = sLng;
    }
    this.onLocationUpdate?.({
      lat: sLat,
      lng: sLng,
      speed_kmh: speed != null ? speed * 3.6 : 0,
      heading: heading ?? 0,
      accuracy,
      distance_walked_km: this.totalDistanceKm,
    });
  }

  private _handleError(error: GeolocationPositionError): void {
    this.onError?.(error);
  }

  private _clearWatch(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private async _acquireWakeLock(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
      }
    } catch {}
  }

  private async _releaseWakeLock(): Promise<void> {
    try {
      await this.wakeLock?.release();
      this.wakeLock = null;
    } catch {}
  }
}

export const trackingManager = TrackingManager.getInstance();
