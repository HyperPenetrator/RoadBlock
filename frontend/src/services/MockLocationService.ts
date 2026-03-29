export type LocationCallback = (location: [number, number]) => void;

export class MockLocationService {
  private intervalId: number | null = null;
  private currentStep = 0;
  private path: [number, number][] = [];
  private onLocationUpdate: LocationCallback | null = null;

  constructor(path: [number, number][], callback: LocationCallback) {
    this.path = path;
    this.onLocationUpdate = callback;
  }

  /**
   * Starts simulating movement along the provided path.
   * @param speed Factor to control simulation speed (default 1)
   */
  start(speed: number = 1000) {
    this.stop();
    this.currentStep = 0;
    
    // Initial update
    if (this.path.length > 0 && this.onLocationUpdate) {
      this.onLocationUpdate(this.path[0]);
    }

    this.intervalId = window.setInterval(() => {
      if (this.currentStep < this.path.length - 1) {
        this.currentStep++;
        if (this.onLocationUpdate) {
          this.onLocationUpdate(this.path[this.currentStep]);
        }
      } else {
        this.stop();
      }
    }, speed);
  }

  stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.currentStep = 0;
  }
}
