import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'
import { Scanner, ScannerError } from './scanner.ts'

/** A device that reads no barcodes: the name can only be typed. It stands in until the camera is drawn natively. */
export const layer = Layer.succeed(Scanner, {
  isAvailable: Effect.succeed(false),
  barcodes: Source.fromStream(Stream.fail(new ScannerError({ cause: 'No camera on React Native yet' }))),
})
