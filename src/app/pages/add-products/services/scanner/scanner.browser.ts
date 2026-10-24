import type * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import * as Source from '#libs/source/source.ts'
import { Scanner, ScannerError } from './scanner.ts'

// The Shape Detection API, which TypeScript's DOM types leave out. Chrome has it on Android, and so has Android's
// WebView, through Google Play services; on a desktop, only on some systems.
type BarcodeDetector = Readonly<{
  detect: (source: HTMLVideoElement) => Promise<ReadonlyArray<Readonly<{ rawValue: string }>>>
}>

type BarcodeDetectorClass = new(options: Readonly<{ formats: ReadonlyArray<string> }>) => BarcodeDetector

// The codes of retail products.
const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

const detectorClass = Effect.suspend(() => {
  const maybeClass = (globalThis as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector
  return maybeClass === undefined
    ? Effect.fail(new ScannerError({ cause: new Error('This browser cannot read barcodes') }))
    : Effect.succeed(maybeClass)
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
    Effect.tap((codes) =>
      Effect.sync(() => {
        const [first] = codes
        if (first !== undefined) Queue.offerUnsafe(queue, first.rawValue)
      })
    ),
    Effect.andThen(Effect.sleep('250 millis')),
    Effect.forever,
  )
})

export const layer = Layer.succeed(Scanner, {
  barcodes: Source.fromStream(Stream.callback(scan).pipe(Stream.changes)),
})
