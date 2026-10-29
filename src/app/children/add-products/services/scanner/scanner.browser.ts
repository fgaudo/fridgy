import type * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { expandUpcE } from '#libs/barcodes/barcode.ts'
import * as Source from '#libs/source/source.ts'
import { Scanner, ScannerError } from './scanner.ts'

// The Shape Detection API, which TypeScript's DOM types leave out. Chrome has it on Android, and so has Android's
// WebView, through Google Play services; on a desktop, only on some systems.
type BarcodeDetector = Readonly<{
  detect: (source: HTMLVideoElement) => Promise<ReadonlyArray<Readonly<{ rawValue: string; format: string }>>>
}>

type BarcodeDetectorClass = (new(options: Readonly<{ formats: ReadonlyArray<string> }>) => BarcodeDetector) & {
  getSupportedFormats: () => Promise<ReadonlyArray<string>>
}

// The codes of retail products.
const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

const detectorClass = Effect.suspend(() => {
  const maybeClass = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  return maybeClass === undefined
    ? Effect.fail(new ScannerError({ cause: new Error('This browser cannot read barcodes') }))
    : Effect.succeed(maybeClass)
})

// Some systems have the class but read none of the formats: those cannot read a product's code either.
const isAvailable = Effect.suspend(() => {
  const maybeClass = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  if (maybeClass === undefined || navigator.mediaDevices === undefined) {
    return Effect.succeed(false)
  }
  return Effect.tryPromise(() => maybeClass.getSupportedFormats()).pipe(
    Effect.map((supported) => formats.some((format) => supported.includes(format))),
    Effect.catch((error) =>
      Effect.logWarning('Could not ask which barcodes can be read', error).pipe(Effect.as(false))
    ),
  )
})

const camera = Effect.acquireRelease(
  Effect.tryPromise({
    try: () => navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
    catch: (cause) => new ScannerError({ cause }),
  }),
  (media) =>
    Effect.sync(() => {
      for (const track of media.getTracks()) track.stop()
    }),
)

// The video is drawn behind the page, under every element: the view leaves a transparent window over it.
const video = (media: MediaStream) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const element = document.createElement('video')
      element.muted = true
      element.playsInline = true
      element.srcObject = media
      element.style.cssText = 'position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -1'
      document.body.prepend(element)
      return element
    }),
    (element) => Effect.sync(() => element.remove()),
  )

// A UPC-E is a UPC-A compressed to 8 digits, which Open Food Facts would read as an EAN-8: it is offered expanded,
// so that only EAN-8, EAN-13 and UPC-A digits leave the scanner. Android's detector reports a UPC-E as its 8
// digits (seen in the emulator, docs/open-food-facts-lookup.md).
const offered = ({ rawValue, format }: Readonly<{ rawValue: string; format: string }>) =>
  format !== 'upc_e'
    ? Effect.succeedSome(rawValue)
    : Opt.match(expandUpcE(rawValue), {
      onNone: () => Effect.logWarning('Read a UPC-E that cannot be expanded', rawValue).pipe(Effect.as(Opt.none())),
      onSome: (expanded) => Effect.succeedSome(expanded),
    })

const scan = Effect.fn('Scan')(function*(queue: Queue.Queue<string, ScannerError | Cause.Done>) {
  const Detector = yield* detectorClass
  const detector = new Detector({ formats })
  const element = yield* video(yield* camera)
  yield* Effect.tryPromise({ try: () => element.play(), catch: (cause) => new ScannerError({ cause }) })
  yield* Effect.logInfo('The camera is on')
  // A few reads a second are enough for a code held in front of the camera, and spare the battery.
  return yield* Effect.tryPromise({
    try: () => detector.detect(element),
    catch: (cause) => new ScannerError({ cause }),
  }).pipe(
    Effect.flatMap(([first]) => first === undefined ? Effect.succeedNone : offered(first)),
    Effect.tap(Opt.match({
      onNone: () => Effect.void,
      onSome: (code) => Effect.sync(() => Queue.offerUnsafe(queue, code)),
    })),
    Effect.andThen(Effect.sleep('250 millis')),
    Effect.forever,
  )
})

export const layer = Layer.succeed(Scanner, {
  isAvailable,
  barcodes: Source.fromStream(Stream.callback(scan).pipe(Stream.changes)),
})
