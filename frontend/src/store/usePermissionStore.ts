import { create } from 'zustand';
import { PermissionService, PermissionStatus } from '../services/PermissionService';

interface PermissionState {
  geolocationStatus: PermissionStatus;
  wakeLockStatus: PermissionStatus;
  isOnboarded: boolean;
  isLoading: boolean;
  
  // Actions
  checkPermissions: () => Promise<void>;
  requestGeolocation: () => Promise<boolean>;
  requestWakeLock: () => Promise<boolean>;
  completeOnboarding: () => void;
  resetPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  geolocationStatus: 'prompt',
  wakeLockStatus: 'prompt',
  isOnboarded: localStorage.getItem('onboarded') === 'true',
  isLoading: false,

  checkPermissions: async () => {
    const currentState = await PermissionService.checkState();
    set({
      geolocationStatus: currentState.geolocation,
      wakeLockStatus: currentState.wakeLock
    });
  },

  requestGeolocation: async () => {
    set({ isLoading: true });
    try {
      await PermissionService.requestGeolocation();
      set({ geolocationStatus: 'granted', isLoading: false });
      return true;
    } catch (e: any) {
      if (e.code === 1) { // PERMISSION_DENIED
        set({ geolocationStatus: 'denied', isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return false;
    }
  },

  requestWakeLock: async () => {
    const success = await PermissionService.requestWakeLock();
    set({ wakeLockStatus: success ? 'granted' : 'denied' });
    return success;
  },

  completeOnboarding: () => {
    localStorage.setItem('onboarded', 'true');
    set({ isOnboarded: true });
  },

  resetPermissions: () => {
    localStorage.removeItem('onboarded');
    set({ isOnboarded: false, geolocationStatus: 'prompt', wakeLockStatus: 'prompt' });
  }
}));
