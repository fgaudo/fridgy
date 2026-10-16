import { App } from '@capacitor/app'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Source from '@/libs/source/source.ts'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { Shell, ShellError } from '../../ports/shell.ts'

export const layer = Layer.succeed(Shell, {
  backButton: Source.fromStream(Stream.callback<void>((queue) =>
    Effect.acquireRelease(
      Effect.tryPromise({
        try: () => App.addListener('backButton', () => Queue.offerUnsafe(queue, undefined)),
        catch: (cause) => new ShellError({ cause }),
      }),
      (handle) => Effect.promise(() => handle.remove()),
    ).pipe(
      // Without the listener the button keeps Android's default behaviour (closing the app).
      Effect.catchTag('ShellError', (error) => Effect.logWarning('Could not listen to the back button', error.cause)),
    )
  )),
  exitApp: Effect.tryPromise({
    try: () => App.exitApp(),
    catch: (cause) => new ShellError({ cause }),
  }),
})
