import { App } from '@capacitor/app'
import { SplashScreen } from '@capacitor/splash-screen'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { Shell, ShellError } from '../../ports/shell.ts'

/** Capacitor plugins; in the browser they fall back to their web implementations. */
export const layer = Layer.succeed(Shell, {
  hideSplashScreen: Effect.tryPromise({
    try: () => SplashScreen.hide(),
    catch: (cause) => new ShellError({ cause }),
  }),
  exitApp: Effect.tryPromise({
    try: () => App.exitApp(),
    catch: (cause) => new ShellError({ cause }),
  }),
})
