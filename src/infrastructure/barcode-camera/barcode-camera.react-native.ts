import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import type { EventSubscription } from 'react-native'
import * as Source from '#libs/source/source.ts'
import { BarcodeCamera, BarcodeCameraError } from './barcode-camera.ts'
import NativeBarcodeCamera from './NativeBarcodeCamera.ts'

const listening = <A>(event: (listener: (value: A) => void) => EventSubscription, listener: (value: A) => void) =>
  Effect.acquireRelease(Effect.sync(() => event(listener)), (subscription) => Effect.sync(() => subscription.remove()))

const camera = Effect.acquireRelease(
  Effect.tryPromise({ try: () => NativeBarcodeCamera.start(), catch: (cause) => new BarcodeCameraError({ cause }) }),
  () => Effect.sync(() => NativeBarcodeCamera.stop()),
)

const read = Effect.fn('ReadBarcodes')(function*(queue: Queue.Queue<string, BarcodeCameraError | Cause.Done>) {
  yield* listening(NativeBarcodeCamera.onRead, (code: string) => Queue.offerUnsafe(queue, code))
  yield* listening(
    NativeBarcodeCamera.onError,
    (cause: string) => Queue.failCauseUnsafe(queue, Cause.fail(new BarcodeCameraError({ cause }))),
  )
  yield* camera
  yield* Effect.logInfo('The camera is on')
})

/**
 * The back camera, read by zxing-cpp in the app's native module. A code is its digits: an EAN-8's 8, or an
 * EAN-13's 13, which a UPC-A or a UPC-E is read as. The camera draws itself in the `BarcodeCameraPreview` on the
 * screen while the codes are observed. Its permission refused, they fail.
 */
export const layer = Layer.succeed(BarcodeCamera, {
  isAvailable: Effect.sync(() => NativeBarcodeCamera.hasCamera()),
  barcodes: Source.fromStream(Stream.callback(read).pipe(Stream.changes)),
})
