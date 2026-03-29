export interface TelemetryData {
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  signal_strength: number;
}

export class TelemetryWebSocketService {
  private socket: WebSocket | null = null;
  private onMessageCallback: (data: TelemetryData) => void;

  constructor(onMessage: (data: TelemetryData) => void) {
    this.onMessageCallback = onMessage;
  }

  connect() {
    // Determine WS URL based on environment
    const API_BASE = import.meta.env.VITE_API_URL || 'https://hrishikeshdutta-roadfirewall-app.hf.space';
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let wsUrl: string;
    if (API_BASE && API_BASE.startsWith('http')) {
        const url = new URL(API_BASE);
        wsUrl = `${wsProto}//${url.host}/ws/telemetry`;
    } else {
        // Dynamic origin detection for Hugging Face/Production
        wsUrl = `${wsProto}//${window.location.host}/ws/telemetry`;
    }

    console.log('Connecting to telemetry grid:', wsUrl);
    this.socket = new WebSocket(wsUrl);

    // Moving average buffer for coordinates
    const history: {lat: number, lng: number}[] = [];
    const MAX_HISTORY = 3;

    this.socket.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);
        
        // Simple Moving Average for path smoothing
        history.push({ lat: data.lat, lng: data.lng });
        if (history.length > MAX_HISTORY) history.shift();
        
        const avgLat = history.reduce((sum, p) => sum + p.lat, 0) / history.length;
        const avgLng = history.reduce((sum, p) => sum + p.lng, 0) / history.length;
        
        // Override with smoothed coordinates
        data.lat = avgLat;
        data.lng = avgLng;

        this.onMessageCallback(data);
      } catch (e) {
        console.error('Telemetry data corruption:', e);
      }
    };

    this.socket.onclose = () => {
      console.warn('Telemetry link severed.');
    };

    this.socket.onerror = (err) => {
      console.error('Telemetry link error:', err);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
