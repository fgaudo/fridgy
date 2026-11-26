// The scanner of `AddProducts`: the camera, checked once per visit of the page, and its dialog over the first step
// (the phase `Scanning`), which reads one barcode and gives it to the lookup.
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import { BarcodeCamera } from '#infrastructure/barcode-camera/barcode-camera.ts'
import * as Name from './name.ts'
import type { Command, State, Transition } from './program.ts'

/** Asked once per visit of the page. `Unavailable` also once the camera has failed: it is not tried again. */
export type Camera = 'Checking' | 'Available' | 'Unavailable'

export type Message = Data.TaggedEnum<{
  // From the view.
  /** The name field's scan button: opens the scanner's dialog. */
  ScanRequested: object
  /** The scanner's close button. */
  ScanClosed: object
  // From subscriptions.
  Scanned: { barcode: string }
  CameraFailed: object
  // From commands.
  CameraChecked: { isAvailable: boolean }
}>

const Message = Data.taggedEnum<Message>()

const Command = Data.taggedEnum<Command>()

export type Key = 'scanner'

export const closeScanner: Message = Message.ScanClosed()

export const canScan = (state: State) => state.camera === 'Available'

/** Whether the camera is read: while the scanner is open, until it fails. */
export const isScanning = (state: State) => state.phase._tag === 'Scanning' && canScan(state)

export const scanner: Tea.Subscription<Message, BarcodeCamera> = Channel.unwrap(
  Effect.map(Effect.service(BarcodeCamera), ({ barcodes }) =>
    barcodes.pipe(
      Channel.map((barcode) => Message.Scanned({ barcode })),
      Channel.catchTag('BarcodeCameraError', (error) =>
        Channel.fromEffectDone(
          Effect.logWarning('Could not use the camera', error.cause).pipe(Effect.as(Message.CameraFailed())),
        )),
    )),
)

// The camera starts anew with each opening of the scanner: the scanner reports a barcode once, so this is what
// lets the same product be read again.
export const subscriptions = (state: State): ReadonlyArray<Key> => isScanning(state) ? ['scanner'] : []

export const checkCamera = Effect.fn('CheckCamera')(
  function*() {
    const { isAvailable } = yield* BarcodeCamera
    const isAvailableNow = yield* isAvailable
    yield* Effect.logInfo(isAvailableNow ? 'The device can read barcodes' : 'The device cannot read barcodes')
    return Opt.some(Message.CameraChecked({ isAvailable: isAvailableNow }))
  },
  Effect.withLogSpan('CheckCamera'),
)

export const update = Match.typeTags<Message, (state: State) => Transition>()({
  ScanRequested: () => (state) =>
    state.phase._tag === 'Naming' && canScan(state)
      ? { state: { ...state, phase: { _tag: 'Scanning' } } }
      : Tea.reject,

  ScanClosed: () => (state) =>
    state.phase._tag === 'Scanning' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,

  // The first barcode read closes the scanner, with a vibration: the phone is pointed at the product, not
  // looked at. Scanning again is how a failed lookup is retried.
  Scanned: ({ barcode }) => (state) =>
    isScanning(state)
      ? Tea.andThen(
        Name.lookingUp(state, barcode),
        (state) => ({ state, commands: [Command.Vibrate({ feedback: 'Confirm' })] }),
      )
      : Tea.defect('Scanned while the camera is off: only the scanner reads it, until it fails'),

  // The scanner stays open, saying why it cannot read, until the user closes it: a dialog that vanished by
  // itself would say nothing.
  CameraFailed: () => (state) =>
    isScanning(state)
      ? { state: { ...state, camera: 'Unavailable' }, commands: [Command.Vibrate({ feedback: 'Reject' })] }
      : Tea.defect('CameraFailed while the camera is off: only the scanner reads it, until it fails'),

  // The root starts each visit of the page anew, and the library rejects an answer for a visit that is gone:
  // the check answers once, and only it leaves `Checking`.
  CameraChecked: ({ isAvailable }) => (state) =>
    state.camera === 'Checking'
      ? { state: { ...state, camera: isAvailable ? 'Available' : 'Unavailable' } }
      : Tea.defect('CameraChecked once the camera is known: the check is asked once per visit of the page'),
})

/** Opens the scanner, once the device can read barcodes. */
export const maybeScanOf = (state: State): Opt.Option<Message> =>
  canScan(state) ? Opt.some(Message.ScanRequested()) : Opt.none()
