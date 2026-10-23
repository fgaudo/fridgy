import { App } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Source from '#libs/source/source.ts'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { Shell, ShellError } from './shell.ts'

// Capacitor's handler takes the button from Android, even with no listener: it goes back in the WebView's
// history, where the app has none, so the button would do nothing. It is enabled only while the button is
// observed (`disableBackButtonHandler` in `capacitor.config.ts` turns it off at start): otherwise Android acts
// on the button, and leaves the app.
export const layer = Layer.succeed(Shell, {
  backButton: Source.fromStream(Stream.callback<void>((queue) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const handle = await App.addListener('backButton', () => Queue.offerUnsafe(queue, undefined))
          await App.toggleBackButtonHandler({ enabled: true })
          return handle
        },
        catch: (cause) => new ShellError({ cause }),
      }),
      (handle) =>
        Effect.promise(async () => {
          await App.toggleBackButtonHandler({ enabled: false })
          await handle.remove()
        }),
    ).pipe(
      Effect.catchTag('ShellError', (error) => Effect.logWarning('Could not listen to the back button', error.cause)),
    )
  )),
})
