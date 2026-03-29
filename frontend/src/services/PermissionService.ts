import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export type PermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface PermissionState {
  geolocation: PermissionStatus;
  wakeLock: PermissionStatus;
}

export class PermissionService {
  private static wakeLockSentinel: any = null;

  /**
   * Checks current permission states for Geolocation and Wake Lock
   */
  static async checkState(): Promise<PermissionState> {
    const state: PermissionState = {
      geolocation: 'prompt',
      wakeLock: 'prompt'
    };

    // Check Geolocation using Capacitor if on native, otherwise Web API
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.checkPermissions();
        state.geolocation = permissions.location as PermissionStatus;
      } catch (e) {
        console.warn('Native permission check failed:', e);
      }
    } else if ('permissions' in navigator) {
      try {
        const geoPerm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        state.geolocation = geoPerm.state as PermissionStatus;
      } catch (e) {
        console.warn('Geolocation permission query failed:', e);
      }
    }

    // Check Wake Lock Support
    if (!('wakeLock' in navigator)) {
      state.wakeLock = 'unsupported';
    }

    return state;
  }

  /**
   * Requests Screen Wake Lock
   */
  static async requestWakeLock(): Promise<boolean> {
    if (!('wakeLock' in navigator)) return false;
    try {
      this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch (err) {
      return false;
    }
  }

  static async releaseWakeLock() {
    if (this.wakeLockSentinel) {
      await this.wakeLockSentinel.release();
      this.wakeLockSentinel = null;
    }
  }

  /**
   * Triggers the Geolocation prompt
   */
  static async requestGeolocation(): Promise<any> {
    if (Capacitor.isNativePlatform()) {
      const permRequest = await Geolocation.requestPermissions();
      if (permRequest.location !== 'granted') {
          throw { code: 1, message: 'User denied geolocation' };
      }
      const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
      });
      return {
          coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
          }
      };
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }
}
