import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.roadfirewall.app',
  appName: 'RoadFireWall',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
