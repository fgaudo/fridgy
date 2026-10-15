import { SplashScreen } from '@capacitor/splash-screen'
import * as Effect from 'effect/Effect'

// Capacitor is configured not to hide the splash screen by itself
// (`launchAutoHide: false`): the app hides it once its first view is displayed
// with its fonts.
// In the browser, Capacitor falls back to a web implementation.
export const hide = Effect.tryPromise(() => SplashScreen.hide()).pipe(
  Effect.catch((error) => Effect.logWarning('Could not hide the splash screen', error)),
)
