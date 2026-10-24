import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'net.gaudo.fridgy',
  appName: 'fridgy',
  webDir: 'dist',
  server: { errorPath: 'error.html' },
  android: {
    // Tailwind's colors (oklch) and the database (OPFS sync access handles, 109) need it.
    minWebViewVersion: 111,
  },
  plugins: {
    // The app enables it while it listens to the back button: otherwise the button is Android's.
    App: { disableBackButtonHandler: true },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
      hidden: false,
      animation: 'NONE',
    },
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 250,
      backgroundColor: '#ffffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },
  },
}

export default config
