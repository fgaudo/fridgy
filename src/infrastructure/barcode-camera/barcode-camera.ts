import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type { Source } from '#libs/source/source.ts'

export class BarcodeCameraError extends Data.TaggedError('BarcodeCameraError')<{
  readonly cause: unknown
}> {}

/** The device's camera, reading the barcodes of retail products, which the page that adds products observes. */
export class BarcodeCamera extends Context.Service<
  BarcodeCamera,
  {
    /**
     * Whether this device can read barcodes: it has a camera's API and reads the codes of retail products. The
     * camera can still be missing or refused: `barcodes` fails then.
     */
    readonly isAvailable: Effect.Effect<boolean>
    /**
     * Event: the barcodes the camera reads, each once until another one is read. The camera is on, drawn behind
     * the page, only while this is observed. Fails when the camera cannot be used (none, or not allowed).
     */
    readonly barcodes: Source<string, never, BarcodeCameraError>
  }
>()('bb6cd6526e6fa91c') {}
