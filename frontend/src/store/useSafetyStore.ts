import { create } from 'zustand';

interface Location {
  lat: number;
  lng: number;
}

interface WeatherInfo {
  temp: number;
  condition: string;
  humidity: number;
}

interface SuggestionData {
  vehicle: string;
  weather: WeatherInfo;
  gear: string[];
  route_alerts: string[];
  safety_score: number;
}

interface SafetyState {
  location: Location | null;
  locationError: string | null;
  isScanning: boolean;
  suggestions: SuggestionData | null;
  lastSuccessfulLocation: Location | null;
  abortController: AbortController | null;
  
  // Actions
  fetchLocationAndScan: () => Promise<void>;
  simulateLocationAndScan: (lat: number, lng: number) => Promise<void>;
  setLocationManually: (lat: number, lng: number) => void;
  resetScan: () => void;
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  location: null,
  locationError: null,
  isScanning: false,
  suggestions: null,
  lastSuccessfulLocation: null,
  abortController: null,

  setLocationManually: (lat: number, lng: number) => {
    set({ location: { lat, lng }, locationError: null });
  },

  simulateLocationAndScan: async (lat: number, lng: number) => {
    const state = get();
    if (state.isScanning) {
      state.abortController?.abort();
    }
    
    const controller = new AbortController();
    set({ isScanning: true, location: { lat, lng }, locationError: null, abortController: controller });
    
    const API_BASE = import.meta.env.VITE_API_URL || 'https://hrishikeshdutta-roadfirewall-app.hf.space';
    
    try {
      const response = await fetch(`${API_BASE}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      
      const data = await response.json();
      set({ suggestions: data, isScanning: false, lastSuccessfulLocation: { lat, lng }, abortController: null });
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error('Simulation error:', e);
      set({ isScanning: false, abortController: null, locationError: 'Link Error: Failed to establish neural connection.' });
    }
  },

  fetchLocationAndScan: async () => {
    const state = get();
    if (state.isScanning) {
      state.abortController?.abort();
    }
    
    const controller = new AbortController();
    set({ isScanning: true, locationError: null, abortController: controller });

    const getPosition = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          enableHighAccuracy: true
        });
      });
    };

    try {
      let lat = 12.9716, lng = 77.5946; // Default
      try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        set({ location: { lat, lng } });
      } catch (err: any) {
        set({ locationError: 'GPS Link Severed. Falling back to primary grid.', location: { lat, lng } });
      }

    const API_BASE = import.meta.env.VITE_API_URL || 'https://hrishikeshdutta-roadfirewall-app.hf.space';

    const response = await fetch(`${API_BASE}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error('API Sync Failure');
      
      const data = await response.json();
      set({ suggestions: data, isScanning: false, lastSuccessfulLocation: { lat, lng }, abortController: null });

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      set({
        suggestions: {
          vehicle: "Emergency Mobile Unit (Offline Cache)",
          weather: { condition: "Unknown", temp: 25, humidity: 40 },
          gear: ["Standard Safety Gear"],
          route_alerts: ["Network instability detected. Safety protocols active."],
          safety_score: 80
        },
        isScanning: false,
        abortController: null
      });
    }
  },

  resetScan: () => set({ suggestions: null, locationError: null, isScanning: false })
}));
