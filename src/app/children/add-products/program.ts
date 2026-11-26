// The page that adds products, one after another, in two steps: the name, typed or scanned, then the expiration
// date, which the child `Expiration` holds. The phases are the first step (`Naming`, with `LookingUp` and `Scanning`
// over it), the second (`Dating`) and the write (`Submitting`). A product added enters the child `Fridge`, and
// starts the next at the name. A failure is told by the child `Snackbar`, which leaves on its own.
import * as Tea from '@fgaudo/effect-tea'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Expiration from '#app/programs/expiration/program.ts'
import * as SnackbarProgram from '#app/programs/snackbar/program.ts'
import * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { BarcodeCamera } from '#infrastructure/barcode-camera/barcode-camera.ts'
import { type Feedback, Haptics } from '#infrastructure/haptics/haptics.ts'
import { Keyboard } from '#infrastructure/keyboard/keyboard.ts'
import { Links } from '#infrastructure/links/links.ts'
import { type FoundProduct, ProductLookup } from '#infrastructure/product-lookup/product-lookup.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Day from '#libs/dates/day.ts'
import { every } from '#libs/timers/timers.ts'
import * as Fridge from './children/fridge/program.ts'

/** Asked once per visit of the page. `Unavailable` also once the camera has failed: it is not tried again. */
export type Camera = 'Checking' | 'Available' | 'Unavailable'

/**
 * Open Food Facts' answer for the barcode last scanned. While it is not `Idle`, the name is the lookup's: the
 * product's name, or none. Typing, clearing or scanning makes it `Idle` again.
 */
export type Lookup = Data.TaggedEnum<{
  /** Nothing scanned, the name changed since, or the lookup still going on (the phase `LookingUp`). */
  Idle: object
  /** `url` is the product's page, for the attribution. */
  Found: Readonly<{ url: string }>
  /** `barcode` is told, so that a misread code shows. */
  NotFound: Readonly<{ barcode: string }>
  Failed: object
}>

/** What the lookup answered: the product's name as the page proposes it, never empty, and its page. */
export type LookupOutcome = Data.TaggedEnum<{
  Found: Readonly<{ name: string; url: string }>
  NotFound: object
  Failed: object
}>

/** What failed: the snackbar says so. */
export type Failure = 'AddFailed' | 'OrderNotKept'

/** The step a product is being added from, to come back to. */
export type Step = 'Naming' | 'Dating'

export type Phase = Data.TaggedEnum<{
  /** The first step: the name. */
  Naming: object
  /**
   * The first step while the scanned barcode is looked up, the name emptied and the lookup's: it takes nothing
   * typed. Left by the answer or a cancel.
   */
  LookingUp: Readonly<{ barcode: string }>
  /** The scanner's dialog, over the first step. */
  Scanning: object
  /** The second step: the expiration date, which the child `Expiration` holds. */
  Dating: object
  /** The product is being added, from a step's button, after which the next product starts at the name. */
  Submitting: Readonly<{ product: Product.Product; from: Step }>
}>

/** The phase, and what is kept in every one: a product being added does not interrupt the next one. */
export type State = Readonly<{
  phase: Phase
  /** The name, as typed. */
  maybeName: Opt.Option<string>
  /** Bumped each time the program replaces the name (a scan, a clearing, a product found): the field is drawn anew. */
  replacements: number
  camera: Camera
  lookup: Lookup
  /** The current time, in the device's zone, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Zoned>
  /** How far the keyboard covers the page's bottom, in dp, navigation bar included: the window is never resized. */
  keyboardInset: number
}>

type Own = Data.TaggedEnum<{
  // From the view.
  /** The name field's text, as the field gives it. */
  NameTyped: { value: string }
  /** The name field's clear button: empties the name. */
  NameCleared: object
  /** The name field's scan button: opens the scanner's dialog. */
  ScanRequested: object
  /** The scanner's close button. */
  ScanClosed: object
  /** The first step's "Set expiration": goes on to the second step. */
  DateRequested: object
  /** The second step's back arrow: back to the name, the date forgotten. */
  DateDismissed: object
  /** Adds the product the step describes. */
  Started: object
  /** The page's close button, on the first step. */
  Closed: object
  /** The first step's "Cancel", while a scanned barcode is looked up: the name stays empty. */
  LookupCancelled: object
  /** The attribution's link, which opens `url` on every press. */
  LinkPressed: { url: string }
  // From subscriptions.
  TimeChanged: { now: DateTime.Zoned }
  Scanned: { barcode: string }
  LookedUp: { barcode: string; outcome: LookupOutcome }
  CameraFailed: object
  /** The platform's back button, while the page is shown. */
  BackPressed: object
  /** The keyboard has come up, changed height or gone down. */
  KeyboardMoved: { inset: number }
  // From commands.
  CameraChecked: { isAvailable: boolean }
  Completed: { succeeded: boolean }
}>

const Own = Data.taggedEnum<Own>()

export type Command = Data.TaggedEnum<{
  /** Asks whether the device can read barcodes. */
  CheckCamera: object
  /** Adds a product that `update` has already validated. */
  Add: { product: Product.Product }
  Vibrate: { feedback: Feedback }
  OpenLink: { url: string }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

/** The lookup of a barcode, keyed by it: a cancel, or the page left, interrupts it. */
type LookupKey = Data.TaggedEnum<{ Lookup: { barcode: string } }>

const LookupKey = Data.taggedEnum<LookupKey>()

type Key = 'clock' | 'back-button' | 'keyboard' | 'scanner' | LookupKey

/** The line under the name field: what the lookup found, or that the name can only be typed. */
export type Supporting = Data.TaggedEnum<{
  Nothing: object
  CameraUnavailable: object
  LookingUp: Readonly<{ barcode: string }>
  /** The name comes from Open Food Facts: `open` opens the product's page there. */
  FromOpenFoodFacts: Readonly<{ open: Own }>
  NotOnOpenFoodFacts: Readonly<{ barcode: string }>
  LookupFailed: object
}>

/** What the name field gives, filled by the view. */
export type NameTyped = Readonly<{ _tag: 'NameTyped' }>

const nameTyped: NameTyped = { _tag: 'NameTyped' }

/** The snackbar over the page: the failure told, drawn anew for each id. */
export type SnackbarShown = SnackbarProgram.Model<Failure>

/** What every phase draws: how far the page keeps clear of the keyboard, which covers whatever is under it. */
type PageShown = Readonly<{ keyboardInset: number }>

/** The first step, drawn in every phase: under the scanner, and under the second step. */
export type NameShown = Readonly<{
  supporting: Supporting
  /** The name field's text: what it starts from as it is drawn. */
  name: string
  /** Changes when the name is replaced by a scan, a clearing or a product found, not by typing. */
  nameKey: number
  /** Over every step, and over the scanner. */
  snackbar: SnackbarShown
}>

/** The second step, over the first. */
export type DateShown = Readonly<{
  name: string
  /** The orders, the date's field, the strip under it and the keypad, which the child draws. */
  expiration: Expiration.Model
}>

export type Model = Data.TaggedEnum<{
  Naming:
    & PageShown
    & NameShown
    & Readonly<{
      close: Own
      nameTyped: NameTyped
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Own>
      /** Opens the scanner, once the device can read barcodes. */
      maybeScan: Opt.Option<Own>
      /** Goes on to the date, once the name is a product's. */
      maybeRequestDate: Opt.Option<Own>
      /** Adds the product, never expiring, once the name is a product's. */
      maybeAdd: Opt.Option<Own>
      fridge: Fridge.Model
    }>
  /** The first step during the lookup: only cancelling it and leaving the page take, and the name is read-only. */
  LookingUp:
    & PageShown
    & NameShown
    & Readonly<{
      close: Own
      cancelLookup: Own
      /** Always away: the fridge is not drawn during a lookup, and its live region is silent. */
      fridge: Fridge.Model
    }>
  /** The scanner's dialog, over the first step, which takes nothing until it closes. */
  Scanning:
    & PageShown
    & NameShown
    & Readonly<{
      /** Once unavailable, the scanner says that the name can only be typed. */
      camera: Camera
      closeScanner: Own
    }>
  Dating:
    & PageShown
    & NameShown
    & DateShown
    & Readonly<{
      back: Own
      /** Adds the product, expiring on the day the date concludes, once it concludes one. */
      maybeAdd: Opt.Option<Own>
    }>
  /**
   * The product is being added: the step it is added from, its controls taking nothing. On the first step, the name
   * still takes what is typed, and keeps the focus and the keyboard, and the products added before go on entering
   * the fridge.
   */
  Adding:
    & PageShown
    & NameShown
    & Readonly<{
      step: Data.TaggedEnum<{
        Naming: Readonly<{
          fridge: Fridge.Model
          /** Whether the scanner opened before: the step is drawn as it was. */
          canScan: boolean
          nameTyped: NameTyped
        }>
        Dating: DateShown
      }>
    }>
}>

/** What a step of the page tells its children. */
type Tell =
  | Readonly<{ _tag: 'Snackbar'; message: SnackbarProgram.External<Failure> }>
  | Readonly<{ _tag: 'Fridge'; message: Fridge.External }>

type Next = Tea.Transition<State, Command, Event, Tell>

const Snackbar = SnackbarProgram.make<Failure>()

/** Whether the camera is read: while the scanner is open, until it fails. */
const isScanning = (state: State) => state.phase._tag === 'Scanning' && state.camera === 'Available'

const hasName = (state: State) => Opt.exists(state.maybeName, (name) => name !== '')

/** The name as the field shows it: empty before any is typed. */
const nameOf = (state: State) => Opt.getOrElse(state.maybeName, () => '')

/** Whether the second step is shown: while it takes the date, and while a product is added from it. */
const showsDate = (state: State) =>
  state.phase._tag === 'Dating' || (state.phase._tag === 'Submitting' && state.phase.from === 'Dating')

// A product to be: the date has no stored one to start from.
const newDate: Expiration.Flags = { maybeStored: Opt.none() }

/** A snackbar telling of a failure: it takes the place of the one standing. */
const telling = (failure: Failure): Tell => ({
  _tag: 'Snackbar',
  message: { _tag: 'Told', notice: failure, lasting: 'Short' },
})

/** The first brand, then the name, unless the name already says the brand. The quantity is left out. */
const composeName = ({ name, maybeBrand }: FoundProduct): string =>
  Opt.match(maybeBrand, {
    onNone: () => name,
    onSome: (brand) => name.toLocaleLowerCase().includes(brand.toLocaleLowerCase()) ? name : `${brand} ${name}`,
  })

const productOf = (state: State, maybeExpirationDate: Opt.Option<Day.Day>) =>
  Opt.flatMap(
    Opt.all([state.maybeName, state.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The day the date concludes, when it names one: digits that name none, or no digits, add nothing. */
const dayOf = (maybeConcluded: Opt.Option<Expiration.Output>): Opt.Option<Day.Day> =>
  Opt.flatMap(maybeConcluded, (concluded) => concluded._tag === 'On' ? Opt.some(concluded.day) : Opt.none())

/**
 * The product a step describes: never expiring from the first, expiring on the day the date concludes from the
 * second. `update` and `makeModel` both ask this.
 */
const productOfStep = (state: State, step: Step, maybeConcluded: Opt.Option<Expiration.Output>) =>
  step === 'Naming'
    ? productOf(state, Opt.none())
    : Opt.flatMap(dayOf(maybeConcluded), (day) => productOf(state, Opt.some(day)))

// Refreshed often, so that the creation date is close to when the user adds the product.
const clock = every('1 second', (now) => Own.TimeChanged({ now }))

const scanner = Channel.unwrap(
  Effect.map(Effect.service(BarcodeCamera), ({ barcodes }) =>
    barcodes.pipe(
      Channel.map((barcode) => Own.Scanned({ barcode })),
      Channel.catchTag('BarcodeCameraError', (error) =>
        Channel.fromEffectDone(
          Effect.logWarning('Could not use the camera', error.cause).pipe(Effect.as(Own.CameraFailed())),
        )),
    )),
)

// Observed as long as the page is shown: while a product is being added, the press is heard and held, so that
// the platform does not leave the app.
const backButton: Tea.Subscription<Own, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Own.BackPressed())),
)

// Observed as long as the page is shown: the keyboard covers the step shown, whichever it is.
const keyboard: Tea.Subscription<Own, Keyboard> = Channel.unwrap(
  Effect.map(
    Effect.service(Keyboard),
    ({ insets }) => Channel.map(insets, (inset) => Own.KeyboardMoved({ inset })),
  ),
)

// It answers once.
const lookup = (barcode: string): Tea.Subscription<Own, ProductLookup> =>
  Channel.fromEffectDone(
    Effect.gen(function*() {
      const { lookup } = yield* ProductLookup
      return yield* lookup(barcode).pipe(
        Effect.map(Opt.match({
          onNone: () => Own.LookedUp({ barcode, outcome: { _tag: 'NotFound' } }),
          onSome: (found) =>
            Own.LookedUp({ barcode, outcome: { _tag: 'Found', name: composeName(found), url: found.url } }),
        })),
        Effect.catchTag('ProductLookupError', (error) =>
          Effect.logWarning('Could not look the product up', error.cause).pipe(
            Effect.as(Own.LookedUp({ barcode, outcome: { _tag: 'Failed' } })),
          )),
      )
    }).pipe(Effect.withLogSpan('Lookup')),
  )

const checkCamera = Effect.fn('CheckCamera')(
  function*() {
    const { isAvailable } = yield* BarcodeCamera
    const isAvailableNow = yield* isAvailable
    yield* Effect.logInfo(isAvailableNow ? 'The device can read barcodes' : 'The device cannot read barcodes')
    return Opt.some(Own.CameraChecked({ isAvailable: isAvailableNow }))
  },
  Effect.withLogSpan('CheckCamera'),
)

const add = Effect.fn('AddProduct')(
  function*({ product }: Readonly<{ product: Product.Product }>) {
    const { insertAll } = yield* ProductStore
    yield* Effect.logDebug('Adding a product', product.name)
    const ids = yield* insertAll([Product.toSnapshot(product)]).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not add the product', error)),
    )
    yield* Effect.logInfo('Added a product', { ids })
  },
  Effect.match({
    onSuccess: () => Own.Completed({ succeeded: true }),
    onFailure: () => Own.Completed({ succeeded: false }),
  }),
  Effect.asSome,
  Effect.withLogSpan('AddProduct'),
)

const vibrate = Effect.fn('Vibrate')(
  function*({ feedback }: Readonly<{ feedback: Feedback }>) {
    const { perform } = yield* Haptics
    yield* perform(feedback).pipe(
      Effect.catchTag('HapticsError', (error) => Effect.logWarning('Could not vibrate', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('Vibrate'),
)

const openLink = Effect.fn('OpenLink')(
  function*({ url }: Readonly<{ url: string }>) {
    const { open } = yield* Links
    yield* open(url).pipe(
      Effect.catchTag('LinksError', (error) => Effect.logWarning('Could not open a link', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('OpenLink'),
)

const { child, withChildren } = Tea.program<{
  state: State
  model: Model
  message: Own
  command: Command
  event: Event
  key: Key
}>()

export const program = withChildren({
  Snackbar: child(Snackbar),
  Fridge: child(Fridge.program),
  // There while the second step is shown: a failed add gives the step back with its digits, and a product added, or
  // the step dismissed, forgets them. The next visit of the step starts anew.
  Expiration: child(Expiration.program, {
    flags: (state) => showsDate(state) ? Opt.some(newDate) : Opt.none(),
    tell: (state) => ({ _tag: 'PageChanged', maybeNow: state.maybeNow, isLocked: state.phase._tag === 'Submitting' }),
  }),
}).make({
  init: {
    state: {
      phase: { _tag: 'Naming' },
      maybeName: Opt.none(),
      replacements: 0,
      camera: 'Checking',
      lookup: { _tag: 'Idle' },
      maybeNow: Opt.none(),
      keyboardInset: 0,
    },
    commands: [Command.CheckCamera()],
  },

  update: (message, children) =>
    Match.typeTags<Own, (state: State) => Next>()({
      // Its place is there in every phase but the lookup's, whose name is the scan's. Covered or disabled (scanner,
      // second step, submitting), it still takes a key typed in the frame before. Validity is decided when going on
      // or adding. A name that changes is no longer the lookup's, whose answer is dropped.
      NameTyped: ({ value }) => (state) =>
        state.phase._tag === 'LookingUp'
          ? Tea.reject
          : value === nameOf(state)
          ? { state }
          : { state: { ...state, maybeName: Opt.some(value), lookup: { _tag: 'Idle' } } },

      // The field is drawn anew, empty: the user owns its text until the program replaces it.
      NameCleared: () => (state) =>
        state.phase._tag === 'Naming' && hasName(state)
          ? {
            state: { ...state, maybeName: Opt.none(), replacements: state.replacements + 1, lookup: { _tag: 'Idle' } },
          }
          : Tea.reject,

      ScanRequested: () => (state) =>
        state.phase._tag === 'Naming' && state.camera === 'Available'
          ? { state: { ...state, phase: { _tag: 'Scanning' } } }
          : Tea.reject,

      ScanClosed: () => (state) =>
        state.phase._tag === 'Scanning' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,

      // The date is the product's: only a name that is one goes on to it.
      DateRequested: () => (state) =>
        state.phase._tag === 'Naming' && Opt.isSome(productOf(state, Opt.none()))
          ? { state: { ...state, phase: { _tag: 'Dating' } } }
          : Tea.reject,

      DateDismissed: () => (state) =>
        state.phase._tag === 'Dating' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,

      LinkPressed: ({ url }) => (state) => ({ state, commands: [Command.OpenLink({ url })] }),

      TimeChanged: ({ now }) => (state) => ({ state: { ...state, maybeNow: Opt.some(now) } }),

      KeyboardMoved: ({ inset }) => (state) => ({ state: { ...state, keyboardInset: inset } }),

      // The first barcode read closes the scanner, with a vibration: the phone is pointed at the product, not
      // looked at. The name is emptied, drawn anew: nothing is added under it before the user has seen the answer.
      // Scanning again is how a failed lookup is retried.
      Scanned: ({ barcode }) => (state) =>
        isScanning(state)
          ? {
            state: {
              ...state,
              phase: { _tag: 'LookingUp', barcode },
              maybeName: Opt.none(),
              replacements: state.replacements + 1,
              lookup: { _tag: 'Idle' },
            },
            commands: [Command.Vibrate({ feedback: 'Confirm' })],
          }
          : Tea.defect('Scanned while the camera is off: only the scanner reads it, until it fails'),

      // A product found names it, drawn anew and focused; otherwise the name stays empty, for the user to type.
      LookedUp: ({ barcode, outcome }) => (state) => {
        if (state.phase._tag !== 'LookingUp' || state.phase.barcode !== barcode) {
          return Tea.defect(
            'LookedUp for a barcode that is not being looked up: only the lookup subscription sends it, while its key is in the state',
          )
        }
        const naming: State = { ...state, phase: { _tag: 'Naming' } }
        return {
          state: Match.valueTags(outcome, {
            Found: ({ name, url }): State => ({
              ...naming,
              maybeName: Opt.some(name),
              replacements: state.replacements + 1,
              lookup: { _tag: 'Found', url },
            }),
            NotFound: (): State => ({ ...naming, lookup: { _tag: 'NotFound', barcode } }),
            Failed: (): State => ({ ...naming, lookup: { _tag: 'Failed' } }),
          }),
        }
      },

      // The lookup stops: the runtime interrupts its subscription, whose answer never arrives. The name stays
      // empty.
      LookupCancelled: () => (state) =>
        state.phase._tag === 'LookingUp' ? { state: { ...state, phase: { _tag: 'Naming' } } } : Tea.reject,

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

      Started: () => (state) => {
        if (state.phase._tag !== 'Naming' && state.phase._tag !== 'Dating') return Tea.reject
        const from = state.phase._tag
        return Opt.match(productOfStep(state, from, children.Expiration.output()), {
          onNone: (): Next => Tea.reject,
          onSome: (product): Next => ({
            state: { ...state, phase: { _tag: 'Submitting', product, from } },
            commands: [Command.Add({ product })],
          }),
        })
      },

      // The next product starts at the name, kept: a second package may be next. The field is not drawn anew. It has
      // kept the focus, and a new one would close the keyboard and open it again. The product enters the fridge, due
      // by the day of the clock.
      Completed: ({ succeeded }) => (state) => {
        if (state.phase._tag !== 'Submitting') {
          return Tea.defect('Completed while no product is being added: only a completion leaves Submitting')
        }
        const { product, from } = state.phase
        if (!succeeded) {
          return {
            state: { ...state, phase: { _tag: from } },
            commands: [Command.Vibrate({ feedback: 'Reject' })],
            tell: [telling('AddFailed')],
          }
        }
        return Opt.match(state.maybeNow, {
          onNone: () => Tea.defect('Completed before the clock has ticked: a product is made only once it has'),
          onSome: (now): Next => ({
            state: { ...state, phase: { _tag: 'Naming' } },
            commands: [Command.Vibrate({ feedback: 'Confirm' })],
            tell: [{ _tag: 'Fridge', message: { _tag: 'Admitted', product, today: Day.fromDateTime(now) } }],
          }),
        })
      },

      // Each press asks the parent to leave, which removes the page on the first one. Leaving while the barcode is
      // looked up interrupts the lookup, with the page.
      Closed: () => (state) =>
        state.phase._tag === 'Naming' || state.phase._tag === 'LookingUp'
          ? { state, events: [Event.LeaveRequested()] }
          : Tea.reject,

      // Closes the scanner or the second step first, then leaves the page. The page is not left while a product is
      // being added.
      BackPressed: () => (state) =>
        state.phase._tag === 'Naming' || state.phase._tag === 'LookingUp'
          ? { state, events: [Event.LeaveRequested()] }
          : state.phase._tag === 'Scanning' || state.phase._tag === 'Dating'
          ? { state: { ...state, phase: { _tag: 'Naming' } } }
          : { state },
    })(message),

  onEvent: {
    // The order picked stays in use for this date either way: only the failure to keep it is told.
    Expiration: () => (state) => ({
      state,
      commands: [Command.Vibrate({ feedback: 'Reject' })],
      tell: [telling('OrderNotKept')],
    }),
    Snackbar: () => (state) => ({ state }),
  },

  runCommand: Match.typeTags<Command>()({
    CheckCamera: checkCamera,
    Add: add,
    Vibrate: vibrate,
    OpenLink: openLink,
  }),

  // The camera starts anew with each opening of the scanner: the scanner reports a barcode once, so this is what
  // lets the same product be read again.
  subscriptions: (state): ReadonlyArray<Key> => [
    'clock',
    'back-button',
    'keyboard',
    ...(isScanning(state) ? ['scanner' as const] : []),
    ...(state.phase._tag === 'LookingUp' ? [LookupKey.Lookup({ barcode: state.phase.barcode })] : []),
  ],

  listen: Match.type<Key>().pipe(
    Match.when('clock', () => clock),
    Match.when('back-button', () => backButton),
    Match.when('keyboard', () => keyboard),
    Match.when('scanner', () => scanner),
    Match.when({ _tag: 'Lookup' }, ({ barcode }) => lookup(barcode)),
    Match.exhaustive,
  ),

  makeModel: (state, children): Model => {
    const name = nameOf(state)
    const { phase } = state
    // A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
    const supporting: Supporting = phase._tag === 'LookingUp'
      ? { _tag: 'LookingUp', barcode: phase.barcode }
      : Match.valueTags(state.lookup, {
        Idle: (): Supporting => state.camera === 'Unavailable' ? { _tag: 'CameraUnavailable' } : { _tag: 'Nothing' },
        Found: ({ url }): Supporting => ({ _tag: 'FromOpenFoodFacts', open: Own.LinkPressed({ url }) }),
        NotFound: ({ barcode }): Supporting => ({ _tag: 'NotOnOpenFoodFacts', barcode }),
        Failed: (): Supporting => ({ _tag: 'LookupFailed' }),
      })
    const pageShown: PageShown = { keyboardInset: state.keyboardInset }
    const nameShown: NameShown = { supporting, name, nameKey: state.replacements, snackbar: children.Snackbar() }
    const maybeAdd = (step: Step) =>
      Opt.map(productOfStep(state, step, children.Expiration.output()), () => Own.Started())
    // The library starts the date in the step that shows it.
    const dateShown = (): DateShown => ({
      name,
      expiration: Opt.getOrElse(
        children.Expiration(),
        () => Tea.defect('The second step is shown, and its date is not there'),
      ),
    })
    return Match.valueTags(phase, {
      // Both ways out need the product the name describes, never expiring: the date is that product's.
      Naming: (): Model => ({
        _tag: 'Naming',
        ...pageShown,
        ...nameShown,
        close: Own.Closed(),
        nameTyped,
        maybeClearName: hasName(state) ? Opt.some(Own.NameCleared()) : Opt.none(),
        maybeScan: state.camera === 'Available' ? Opt.some(Own.ScanRequested()) : Opt.none(),
        maybeRequestDate: Opt.map(productOf(state, Opt.none()), () => Own.DateRequested()),
        maybeAdd: maybeAdd('Naming'),
        fridge: children.Fridge(),
      }),
      LookingUp: (): Model => ({
        _tag: 'LookingUp',
        ...pageShown,
        ...nameShown,
        close: Own.Closed(),
        cancelLookup: Own.LookupCancelled(),
        fridge: { _tag: 'Away' },
      }),
      Scanning: (): Model => ({
        _tag: 'Scanning',
        ...pageShown,
        ...nameShown,
        camera: state.camera,
        closeScanner: Own.ScanClosed(),
      }),
      Dating: (): Model => ({
        _tag: 'Dating',
        ...pageShown,
        ...nameShown,
        ...dateShown(),
        back: Own.DateDismissed(),
        maybeAdd: maybeAdd('Dating'),
      }),
      Submitting: ({ from }): Model => ({
        _tag: 'Adding',
        ...pageShown,
        ...nameShown,
        step: from === 'Naming'
          ? { _tag: 'Naming', fridge: children.Fridge(), canScan: state.camera === 'Available', nameTyped }
          : { _tag: 'Dating', ...dateShown() },
      }),
    })
  },
})

export type Message = Tea.MessageOf<typeof program>
