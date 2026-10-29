import * as Cause from 'effect/Cause'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import type { EventSubscription } from 'react-native'
import BarcodeCamera from './NativeBarcodeCamera.ts'

export class BarcodeCameraError extends Data.TaggedError('BarcodeCameraError')<{
  readonly cause: unknown
}> {}

/** Whether the device has a back camera. It can still be refused, or fail to open: `reads` fails then. */
export const hasCamera = Effect.sync(() => BarcodeCamera.hasCamera())

const listening = <A>(event: (listener: (value: A) => void) => EventSubscription, listener: (value: A) => void) =>
  Effect.acquireRelease(Effect.sync(() => event(listener)), (subscription) => Effect.sync(() => subscription.remove()))

const camera = Effect.acquireRelease(
  Effect.tryPromise({ try: () => BarcodeCamera.start(), catch: (cause) => new BarcodeCameraError({ cause }) }),
  () => Effect.sync(() => BarcodeCamera.stop()),
)

const read = Effect.fn('ReadBarcodes')(function*(queue: Queue.Queue<string, BarcodeCameraError | Cause.Done>) {
  yield* listening(BarcodeCamera.onRead, (code: string) => Queue.offerUnsafe(queue, code))
  yield* listening(
    BarcodeCamera.onError,
    (cause: string) => Queue.failCauseUnsafe(queue, Cause.fail(new BarcodeCameraError({ cause }))),
  )
  yield* camera
  yield* Effect.logInfo('The camera is on')
})

/**
 * The digits of the codes the back camera reads (an EAN-8's 8, or an EAN-13's 13, which a UPC-A or a UPC-E is read
 * as), one at each frame it reads one in. The camera is on while this is consumed, and
 * draws itself in the `BarcodeCameraPreview` on the screen meanwhile. It fails when its permission is refused.
 */
export const reads: Stream.Stream<string, BarcodeCameraError> = Stream.callback(read)
