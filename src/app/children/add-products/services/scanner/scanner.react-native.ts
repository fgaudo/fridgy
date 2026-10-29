import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'
import * as BarcodeCamera from '#infrastructure/barcode-camera/barcode-camera.ts'
import * as Source from '#libs/source/source.ts'
import { Scanner, ScannerError } from './scanner.ts'

/** The back camera, read by zxing-cpp in the app's native module. */
export const layer = Layer.succeed(Scanner, {
  isAvailable: BarcodeCamera.hasCamera,
  barcodes: Source.fromStream(
    BarcodeCamera.reads.pipe(
      Stream.mapError((error) => new ScannerError({ cause: error.cause })),
      Stream.changes,
    ),
  ),
})
