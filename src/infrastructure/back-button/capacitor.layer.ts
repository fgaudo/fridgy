import { App } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import { BackButton, BackButtonError, observed } from './back-button.ts'

// Capacitor's handler takes the button from Android, even with no listener: it goes back in the WebView's
// history, where the app has none, so the button would do nothing. It is enabled only while the button is
// observed (`disableBackButtonHandler` in `capacitor.config.ts` turns it off at start): otherwise Android acts
// on the button, and leaves the app.
const toggle = (enabled: boolean) =>
  Effect.tryPromise({
    try: () => App.toggleBackButtonHandler({ enabled }),
    catch: (cause) => new BackButtonError({ cause }),
  }).pipe(
    Effect.catchTag('BackButtonError', (error) =>
      Effect.logWarning('Could not toggle the back button handler', { enabled }, error.cause)),
  )

export const layer = Layer.effect(
  BackButton,
  Effect.gen(function*() {
    const { presses, press } = yield* observed(toggle(true), toggle(false))
    yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => App.addListener('backButton', press),
        catch: (cause) => new BackButtonError({ cause }),
      }),
      (handle) => Effect.promise(() => handle.remove()),
    ).pipe(
      Effect.catchTag(
        'BackButtonError',
        (error) => Effect.logWarning('Could not listen to the back button', error.cause),
      ),
    )
    return { presses }
  }),
)
