import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'net.gaudo.fridgy',
  appName: 'fridgy',
  webDir: 'dist',
  server: { errorPath: 'error.html' },
  android: {
    // The lowest version with everything the app uses: the `scrollend` event (114; without it the list never snaps
    // back to the top after the first scroll), Tailwind 4 and the shadows' `color-mix` (111), the database's
    // synchronous OPFS access handles (108).
    minWebViewVersion: 114,
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
    // The surface and the primary of the light scheme of `src/palette.generated.css`, in hex: the plugin takes one
    // color for both themes, and the splash image, which has a night variant, covers the background.
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 250,
      backgroundColor: '#fff8f5ff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#845425',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },
  },
}

export default config
