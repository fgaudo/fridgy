import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.gaudo.fridgy',
  appName: 'fridgy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
