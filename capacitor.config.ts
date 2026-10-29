import type { CapacitorConfig } from '@capacitor/cli'
import packageJson from './package.json' with { type: 'json' }

const config: CapacitorConfig = {
  appId: 'net.gaudo.fridgy',
  appName: 'Fridgy',
  webDir: 'dist',
  server: { errorPath: 'error.html' },
  android: {
    // The lowest version with everything the app uses: scroll-driven animations (115; without them Home's top app bar
    // never collapses), the `scrollend` event (114; without it the list never snaps after a scroll), Tailwind 4 and
    // the shadows' `color-mix` (111), the database's synchronous OPFS access handles (108). The edition in
    // `check-floor` (`package.json`) is the last one this WebView implements whole, and moves with this number.
    minWebViewVersion: 115,
    // How Open Food Facts asks every app to identify itself: the WebView's own User-Agent, with this after it.
    appendUserAgent: `Fridgy/${packageJson.version} (fgaudo+fridgy@gmail.com)`,
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
      backgroundColor: '#fff5edff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#894c00',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true,
    },
  },
}

export default config
