// The page that adds products, one after another, in two steps: the name, typed or scanned, then the expiration
// date, typed on a keypad. The states are the first step (`Naming`, with `LookingUp` and `Scanning` over it), the
// second (`Dating`) and the write (`Submitting`). A product added enters the fridge, and starts the next at the
// name. A failure is told by a snackbar, which leaves on its own.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { type Feedback, Haptics } from '#infrastructure/haptics/haptics.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import { after, every } from '#libs/timers/timers.ts'
import * as AddProducts from './services/add-products/add-products.ts'
import { DateOrderSetting } from './services/date-order-setting/date-order-setting.ts'
import { type FoundProduct, ProductLookup } from './services/product-lookup/product-lookup.ts'
import { Scanner } from './services/scanner/scanner.ts'

export type { Digit } from '#libs/dates/digit-date-entry.ts'

type Digit = DigitDateEntry.Digit

/** Asked once per visit of the page. `Unavailable` also once the camera has failed: it is not tried again. */
export type Camera = 'Checking' | 'Available' | 'Unavailable'

/**
 * Open Food Facts' answer for the barcode last scanned. While it is not `Idle`, the name is the lookup's: the
 * product's name, or none. Typing, clearing or scanning makes it `Idle` again.
 */
export type Lookup = Data.TaggedEnum<{
  /** Nothing scanned, the name changed since, or the lookup still going on (the state `LookingUp`). */
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

/** What is kept in every state: a product being added does not interrupt the next one. */
export type Form = Readonly<{
  maybeName: Opt.Option<string>
  /** Bumped each time the program replaces the name (a scan, a clearing, a product added): the input is drawn anew. */
  replacements: number
  camera: Camera
  lookup: Lookup
  /** The current time, in the device's zone, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Zoned>
  /** The order the digits of a date are read in, once the setting has been read. */
  maybeOrder: Opt.Option<DateOrder.DateOrder>
  /** How many products this visit of the page has added: each one's arrival in the fridge goes by its number. */
  added: number
  fridge: Fridge
  snackbar: Snackbar
}>

/** Material shows one snackbar at a time: one that comes after another waits for it to leave. */
export type Entrance = 'Alone' | 'AfterAnother'

/** What failed: the snackbar says so. */
export type Failure = 'AddFailed' | 'OrderNotKept'

/** The snackbar, until it has stood its time. `id` tells one from the next. */
export type Snackbar = Data.TaggedEnum<{
  None: object
  Shown: Readonly<{ id: number; failure: Failure; entrance: Entrance }>
}>

/**
 * A product added, on its way into the fridge (`docs/product-flight.md`). `id` is its number among those added.
 * `entrance` says whether the fridge appeared with it, or was there already.
 */
export type Arrival = Readonly<{ id: number; product: Product.Product; entrance: 'WithFridge' | 'IntoOpenFridge' }>

/**
 * The fridge that products added enter: away, open while any is on its way, then closing behind the last. A visit
 * is named by the first product's id, so that a fridge that comes back is drawn anew.
 */
export type Fridge = Data.TaggedEnum<{
  Away: object
  /** `opening` says whether the door opens as the fridge appears, or again, as it was closing. */
  Open: Readonly<{ visit: number; opening: 'WithFridge' | 'Again'; arrivals: Arr.NonEmptyReadonlyArray<Arrival> }>
  /** The door closes behind `last` and the fridge settles; then it goes. */
  Closing: Readonly<{ visit: number; last: Arrival }>
}>

/** The expiration date being typed: it exists only in the second step, and starts anew with each. */
export type DateForm = DigitDateEntry.Entry

/** The step a product is being added from, to come back to. */
export type Step = Data.TaggedEnum<{
  Naming: object
  Dating: Readonly<{ date: DateForm }>
}>

export type State = Data.TaggedEnum<{
  /** The first step: the name. */
  Naming: Readonly<{ form: Form }>
  /**
   * The first step while the scanned barcode is looked up, the name emptied. Left by the answer, a cancel, or a
   * key typed just before.
   */
  LookingUp: Readonly<{ form: Form; barcode: string }>
  /** The scanner's dialog, over the first step. */
  Scanning: Readonly<{ form: Form }>
  /** The second step: the expiration date. */
  Dating: Readonly<{ form: Form; date: DateForm }>
  /** The product is being added, from a step's button, after which the next product starts at the name. */
  Submitting: Readonly<{ form: Form; product: Product.Product; step: Step }>
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  NameChanged: { name: string }
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
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** The keypad's clear key: erases every digit. */
  DateCleared: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: Day.Day }
  /** The second step's segmented button: the order the digits are read in, kept for every date to come. */
  OrderPicked: { order: DateOrder.DateOrder }
  /** Adds the product the step describes. */
  Started: object
  /** The page's close button, on the first step. */
  Closed: object
  /** The first step's "Cancel", while a scanned barcode is looked up: the name stays empty. */
  LookupCancelled: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Zoned }
  /** The order kept: the setting reports it when the page opens, and after every pick. */
  OrderChanged: { order: DateOrder.DateOrder }
  Scanned: { barcode: string }
  LookedUp: { barcode: string; outcome: LookupOutcome }
  CameraFailed: object
  /** The platform's back button, while the page is shown. */
  BackPressed: object
  /** The product added as the `id`th is in the fridge. */
  Arrived: { id: number }
  /** The fridge has closed behind the product added as the `id`th, and settled. */
  FridgeClosed: { id: number }
  /** The snackbar has stood its time. */
  SnackbarExpired: object
  // From commands.
  CameraChecked: { isAvailable: boolean }
  OrderKept: { succeeded: boolean }
  Completed: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  /** Asks whether the device can read barcodes. */
  CheckCamera: object
  /** Adds a product that `update` has already validated. */
  Add: { product: Product.Product }
  /** Keeps the order the digits of a date are read in, which the setting then reports. */
  KeepOrder: { order: DateOrder.DateOrder }
  Vibrate: { feedback: Feedback }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps =
  | AddProducts.AddProducts
  | DateOrderSetting
  | Scanner
  | ProductLookup
  | Haptics
  | BackButton
  | DateTime.CurrentTimeZone

/** A day the digits name: the chosen one, or one to pick while the step takes input. */
export type DateChoice = Readonly<{
  date: Day.Day
  choice: Data.TaggedEnum<{ Chosen: object; Offered: Readonly<{ maybeChoose: Opt.Option<Message> }> }>
}>

/** An order the digits can be read in: the one in use, or one to pick while the step takes input. */
export type OrderChoice = Readonly<{
  order: DateOrder.DateOrder
  choice: Data.TaggedEnum<{ Current: object; Offered: Readonly<{ maybePick: Opt.Option<Message> }> }>
}>

/** The line under the name field: what the lookup found, or that the name can only be typed. */
export type Supporting = Data.TaggedEnum<{
  Nothing: object
  CameraUnavailable: object
  LookingUp: Readonly<{ barcode: string }>
  /** The name comes from Open Food Facts: `url` is the product's page there. */
  FromOpenFoodFacts: Readonly<{ url: string }>
  NotOnOpenFoodFacts: Readonly<{ barcode: string }>
  LookupFailed: object
}>

/** The first step, drawn in every state: under the scanner, and under the second step. */
export type NameShown = Readonly<{
  supporting: Supporting
  name: string
  /** Changes when the name is replaced by a scan or a clearing, or a product was added, not by typing. */
  nameKey: number
  /** Over every step, and over the scanner. */
  snackbar: Snackbar
}>

/** The second step, over the first. */
export type DateShown = Readonly<{
  name: string
  /** `Unknown` until the setting has been read, a moment after the page opens. */
  order: Data.TaggedEnum<{
    Unknown: object
    Known: Readonly<{ order: DateOrder.DateOrder; choices: Arr.NonEmptyReadonlyArray<OrderChoice> }>
  }>
  /** The date's field: the digits as typed. */
  digits: string
  /**
   * Under the field: how to type a date, while the digits name no day yet; the days they name; or that they name
   * none, and no digits typed after them can.
   */
  strip: Data.TaggedEnum<{
    Hint: object
    Naming: Readonly<{ choices: Arr.NonEmptyReadonlyArray<DateChoice> }>
    NamingNothing: object
  }>
}>

/**
 * When a product entering the fridge is due, as the disc of its row in Home's list tells it, by the days left
 * (`docs/freshness.md`). A product just added has not expired: one whose day ends during its flight is due now.
 */
export type Due = Data.TaggedEnum<{
  Never: object
  /** Today or tomorrow. */
  Now: Readonly<{ expirationDate: Day.Day }>
  /** Within `Product.SOON_DAYS`. */
  Soon: Readonly<{ expirationDate: Day.Day }>
  Later: Readonly<{ expirationDate: Day.Day }>
}>

/** A product on its way into the fridge, as its disc. */
export type ArrivalShown = Arrival & Readonly<{ due: Due }>

export type FridgeShown = Data.TaggedEnum<{
  Away: object
  Open: Readonly<{ visit: number; opening: 'WithFridge' | 'Again'; arrivals: Arr.NonEmptyReadonlyArray<ArrivalShown> }>
  Closing: Readonly<{ visit: number; last: Arrival }>
}>

export type Model = Data.TaggedEnum<{
  Naming:
    & NameShown
    & Readonly<{
      close: Message
      changeName: (name: string) => Message
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Message>
      /** Opens the scanner, once the device can read barcodes. */
      maybeScan: Opt.Option<Message>
      /** Goes on to the date, once the name is a product's. */
      maybeRequestDate: Opt.Option<Message>
      /** Adds the product, never expiring, once the name is a product's. */
      maybeAdd: Opt.Option<Message>
      fridge: FridgeShown
    }>
  /** The first step during the lookup: only cancelling it and leaving the page take. */
  LookingUp:
    & NameShown
    & Readonly<{
      close: Message
      cancelLookup: Message
    }>
  /** The scanner's dialog, over the first step, which takes nothing until it closes. */
  Scanning:
    & NameShown
    & Readonly<{
      /** Once unavailable, the scanner says that the name can only be typed. */
      camera: Camera
      closeScanner: Message
    }>
  Dating:
    & NameShown
    & DateShown
    & Readonly<{
      back: Message
      /** The keypad's keys: none past a date's longest. */
      maybeTypeDigit: Opt.Option<(digit: Digit) => Message>
      /** None with nothing to erase. */
      maybeEraseDigit: Opt.Option<Message>
      /** None with nothing to clear. */
      maybeClearDate: Opt.Option<Message>
      /** Adds the product, expiring on the day the digits name, once they name one. */
      maybeAdd: Opt.Option<Message>
    }>
  /**
   * The product is being added: the step it is added from, its controls disabled. On the first step, the products
   * added before go on entering the fridge.
   */
  Adding:
    & NameShown
    & Readonly<{
      step: Data.TaggedEnum<{ Naming: Readonly<{ fridge: FridgeShown }>; Dating: DateShown }>
    }>
}>

/** Whether the camera is read: while the scanner is open, until it fails. */
const isScanning = (state: State) => state._tag === 'Scanning' && state.form.camera === 'Available'

const hasName = (form: Form) => Opt.exists(form.maybeName, (name) => name !== '')

const withForm = (state: State, change: (form: Form) => Form): State => ({ ...state, form: change(state.form) })

// Material's snackbar without an action: long enough to read it.
const SNACKBAR_DURATION = Duration.seconds(4)

/** A snackbar telling of a failure, after the one standing, if any. */
const told = (failure: Failure) => (form: Form): Form => ({
  ...form,
  snackbar: form.snackbar._tag === 'Shown'
    ? { _tag: 'Shown', id: form.snackbar.id + 1, failure, entrance: 'AfterAnother' }
    : { _tag: 'Shown', id: 0, failure, entrance: 'Alone' },
})

const stepOf = (state: State & { _tag: 'Naming' | 'Dating' }): Step =>
  state._tag === 'Naming' ? { _tag: 'Naming' } : { _tag: 'Dating', date: state.date }

const resume = (step: Step, form: Form): State =>
  step._tag === 'Naming' ? { _tag: 'Naming', form } : { _tag: 'Dating', form, date: step.date }

/** The days the digits name, read in the order in use, on which a product added now may expire. */
const offeredDates = (form: Form, date: DateForm): ReadonlyArray<Day.Day> =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => [],
    onSome: ([now, order]) => DigitDateEntry.offered(date, Day.fromDateTime(now), order, Product.canExpireOn(now)),
  })

/** Whether the digits, or more typed after them, name a day on which a product added now may expire. */
const canCompleteDate = (form: Form, date: DateForm): boolean =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => false,
    onSome: ([now, order]) => DigitDateEntry.canComplete(date, Day.fromDateTime(now), order, Product.canExpireOn(now)),
  })

/** The first brand, then the name, unless the name already says the brand. The quantity is left out. */
const composeName = ({ name, maybeBrand }: FoundProduct): string =>
  Opt.match(maybeBrand, {
    onNone: () => name,
    onSome: (brand) => name.toLocaleLowerCase().includes(brand.toLocaleLowerCase()) ? name : `${brand} ${name}`,
  })

/** The day the digits name: the one picked, while they still name it, or else the only one they name. */
const maybeNamedDate = (form: Form, date: DateForm): Opt.Option<Day.Day> =>
  DigitDateEntry.named(date, offeredDates(form, date))

/** The second step with its date changed by a key, or rejected when the key does not apply. */
const keyed = (
  state: State,
  key: (form: Form, date: DateForm) => Opt.Option<DateForm>,
): Tea.Transition<State, Command, Event> =>
  state._tag === 'Dating'
    ? Opt.match(key(state.form, state.date), {
      onNone: () => Tea.reject,
      onSome: (date) => ({ state: { ...state, date } }),
    })
    : Tea.reject

const productOf = (form: Form, maybeExpirationDate: Opt.Option<Day.Day>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The product a step describes: never expiring from the first, expiring on the day named from the second. */
const productOfStep = (state: State & { _tag: 'Naming' | 'Dating' }) =>
  state._tag === 'Naming'
    ? productOf(state.form, Opt.none())
    : Opt.flatMap(maybeNamedDate(state.form, state.date), (date) => productOf(state.form, Opt.some(date)))

// Refreshed often, so that the creation date is close to when the user adds the product.
const clock = every('1 second', (now) => Message.TimeChanged({ now }))

// The phases of `docs/product-flight.md`, which the view's motion must fit in: what it draws is removed when they
// end. A product's flight is long-2, after the fridge's appearance (medium-2) when it brings the fridge. The door
// closes in short-4 and the fridge settles in medium-1. Under another page, the timers wait for the page to be back.
const ARRIVAL_DURATIONS: Readonly<Record<Arrival['entrance'], Duration.Duration>> = {
  WithFridge: Duration.millis(300 + 500),
  IntoOpenFridge: Duration.millis(500),
}

const CLOSING_DURATION = Duration.millis(200 + 250)

/** Ends once the arrival's product is in the fridge. */
const arrivalTimer = ({ id, entrance }: Arrival): Tea.Subscription<Message, Deps> =>
  after(ARRIVAL_DURATIONS[entrance], Message.Arrived({ id }))

/** Ends once the fridge has closed behind the product added as the `id`th. */
const closingTimer = (id: number): Tea.Subscription<Message, Deps> =>
  after(CLOSING_DURATION, Message.FridgeClosed({ id }))

/** Ends once the snackbar has stood its time. */
const snackbarTimer: Tea.Subscription<Message, Deps> = after(SNACKBAR_DURATION, Message.SnackbarExpired())

/**
 * An arrival's timer is keyed by its id, the closing's by the last arrival's, the snackbar's by its id: the next one
 * starts it anew.
 */
type Key =
  | string
  | readonly ['arriving', number]
  | readonly ['closing', number]
  | readonly ['snackbar', number]

/** When a product is due, by the days from `today`. */
const dueOf = (today: Day.Day, { maybeExpirationDate }: Product.Product): Due =>
  Opt.match(maybeExpirationDate, {
    onNone: (): Due => ({ _tag: 'Never' }),
    onSome: (expirationDate): Due => {
      const days = Day.daysBetween(today, expirationDate)
      return days <= 1
        ? { _tag: 'Now', expirationDate }
        : days <= Product.SOON_DAYS
        ? { _tag: 'Soon', expirationDate }
        : { _tag: 'Later', expirationDate }
    },
  })

/**
 * The fridge with each product on its way as its disc, by the clock's day. A product is made only once the clock has
 * ticked, so the fridge is away until then.
 */
const fridgeShown = (form: Form): FridgeShown =>
  Opt.match(form.maybeNow, {
    onNone: (): FridgeShown => ({ _tag: 'Away' }),
    onSome: (now): FridgeShown => {
      const { fridge } = form
      if (fridge._tag !== 'Open') return fridge
      const today = Day.fromDateTime(now)
      return {
        ...fridge,
        arrivals: Arr.map(fridge.arrivals, (arrival) => ({ ...arrival, due: dueOf(today, arrival.product) })),
      }
    },
  })

/** The fridge with a product added: it appears with the first, stays open for the next, and opens again for one. */
const admitted = (fridge: Fridge, id: number, product: Product.Product): Fridge =>
  Match.valueTags(fridge, {
    Away: (): Fridge => ({
      _tag: 'Open',
      visit: id,
      opening: 'WithFridge',
      arrivals: [{ id, product, entrance: 'WithFridge' }],
    }),
    Open: (open): Fridge => ({
      ...open,
      arrivals: Arr.append(open.arrivals, { id, product, entrance: 'IntoOpenFridge' }),
    }),
    Closing: ({ visit }): Fridge => ({
      _tag: 'Open',
      visit,
      opening: 'Again',
      arrivals: [{ id, product, entrance: 'IntoOpenFridge' }],
    }),
  })

const dateOrder: Tea.Subscription<Message, DateOrderSetting> = Channel.unwrap(
  Effect.map(
    Effect.service(DateOrderSetting),
    ({ changes }) => Channel.map(changes, (order) => Message.OrderChanged({ order })),
  ),
)

const scanner = Channel.unwrap(
  Effect.map(Effect.service(Scanner), ({ barcodes }) =>
    barcodes.pipe(
      Channel.map((barcode) => Message.Scanned({ barcode })),
      Channel.catchTag('ScannerError', (error) =>
        Channel.fromEffectDone(
          Effect.logWarning('Could not use the camera', error.cause).pipe(Effect.as(Message.CameraFailed())),
        )),
    )),
)

// Observed as long as the page is shown: while a product is being added, the press is heard and held, so that
// the platform does not leave the app.
const backButton: Tea.Subscription<Message, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Message.BackPressed())),
)

// Keyed by the barcode: a scan of another one, or a change of the name, interrupts it. It answers once.
const lookup = (barcode: string): Tea.Subscription<Message, ProductLookup> =>
  Channel.fromEffectDone(
    Effect.gen(function*() {
      const { lookup } = yield* ProductLookup
      return yield* lookup(barcode).pipe(
        Effect.map(Opt.match({
          onNone: () => Message.LookedUp({ barcode, outcome: { _tag: 'NotFound' } }),
          onSome: (found) =>
            Message.LookedUp({ barcode, outcome: { _tag: 'Found', name: composeName(found), url: found.url } }),
        })),
        Effect.catchTag('ProductLookupError', (error) =>
          Effect.logWarning('Could not look the product up', error.cause).pipe(
            Effect.as(Message.LookedUp({ barcode, outcome: { _tag: 'Failed' } })),
          )),
      )
    }).pipe(Effect.withLogSpan('Lookup')),
  )

const checkCamera = Effect.fn('CheckCamera')(
  function*() {
    const { isAvailable } = yield* Scanner
    const isAvailableNow = yield* isAvailable
    yield* Effect.logInfo(isAvailableNow ? 'The device can read barcodes' : 'The device cannot read barcodes')
    return Opt.some(Message.CameraChecked({ isAvailable: isAvailableNow }))
  },
  Effect.withLogSpan('CheckCamera'),
)

const add = Effect.fn('AddProduct')(
  function*({ product }: Readonly<{ product: Product.Product }>) {
    const { add } = yield* AddProducts.AddProducts
    yield* Effect.logDebug('Adding a product', product.name)
    const id = yield* pipe(
      AddProducts.AddProduct({ snapshot: Product.toSnapshot(product) }),
      Effect.request(add),
      // The storage logs the cause.
      Effect.tapError(() => Effect.logWarning('Could not add the product')),
    )
    yield* Effect.logInfo('Added a product', { id })
  },
  Effect.match({
    onSuccess: () => Message.Completed({ succeeded: true }),
    onFailure: () => Message.Completed({ succeeded: false }),
  }),
  Effect.asSome,
  Effect.withLogSpan('AddProduct'),
)

const keepOrder = Effect.fn('KeepOrder')(
  function*({ order }: Readonly<{ order: DateOrder.DateOrder }>) {
    const { set } = yield* DateOrderSetting
    yield* set(order).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not keep the date order', error.cause)),
    )
    yield* Effect.logInfo('Kept the date order', { order })
  },
  Effect.match({
    onSuccess: () => Message.OrderKept({ succeeded: true }),
    onFailure: () => Message.OrderKept({ succeeded: false }),
  }),
  Effect.asSome,
  Effect.withLogSpan('KeepOrder'),
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

/** Adds the product a step describes, when it describes one. */
const start = (state: State & { _tag: 'Naming' | 'Dating' }): Tea.Transition<State, Command, Event> =>
  Opt.match(productOfStep(state), {
    onNone: () => Tea.reject,
    onSome: (product) => ({
      state: { _tag: 'Submitting', form: state.form, product, step: stepOf(state) },
      commands: [Command.Add({ product })],
    }),
  })

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
  event: Event
}> = {
  init: {
    state: {
      _tag: 'Naming',
      form: {
        maybeName: Opt.none(),
        replacements: 0,
        camera: 'Checking',
        lookup: { _tag: 'Idle' },
        maybeNow: Opt.none(),
        maybeOrder: Opt.none(),
        added: 0,
        fridge: { _tag: 'Away' },
        snackbar: { _tag: 'None' },
      },
    },
    commands: [Command.CheckCamera()],
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted while the input is covered or disabled too (scanner, second step, submitting): a key typed just
    // before is kept. Validity is decided when going on or adding. A lookup going on stops: the name is no longer its.
    NameChanged: ({ name }) => (state) => {
      const named = withForm(state, (form) => ({ ...form, maybeName: Opt.some(name), lookup: { _tag: 'Idle' } }))
      return { state: named._tag === 'LookingUp' ? { _tag: 'Naming', form: named.form } : named }
    },

    // The input is drawn anew, empty: the user owns its text until the program replaces it.
    NameCleared: () => (state) =>
      state._tag === 'Naming' && hasName(state.form)
        ? {
          state: withForm(state, (form) => ({
            ...form,
            maybeName: Opt.none(),
            replacements: form.replacements + 1,
            lookup: { _tag: 'Idle' },
          })),
        }
        : Tea.reject,

    ScanRequested: () => (state) =>
      state._tag === 'Naming' && state.form.camera === 'Available'
        ? { state: { _tag: 'Scanning', form: state.form } }
        : Tea.reject,

    ScanClosed: () => (state) =>
      state._tag === 'Scanning' ? { state: { _tag: 'Naming', form: state.form } } : Tea.reject,

    // The date is the product's: only a name that is one goes on to it.
    DateRequested: () => (state) =>
      state._tag === 'Naming' && Opt.isSome(productOf(state.form, Opt.none()))
        ? { state: { _tag: 'Dating', form: state.form, date: DigitDateEntry.empty } }
        : Tea.reject,

    DateDismissed: () => (state) =>
      state._tag === 'Dating' ? { state: { _tag: 'Naming', form: state.form } } : Tea.reject,

    DigitTyped: ({ digit }) => (state) => keyed(state, (_, date) => DigitDateEntry.typeDigit(digit)(date)),

    DigitErased: () => (state) => keyed(state, (_, date) => DigitDateEntry.eraseDigit(date)),

    DateCleared: () => (state) => keyed(state, (_, date) => DigitDateEntry.clear(date)),

    DateChosen: ({ date }) => (state) =>
      keyed(state, (form, typed) => DigitDateEntry.choose(date, offeredDates(form, typed))(typed)),

    // Only another order than the one in use, once it is known: a tap on the selected segment does nothing. The
    // order applies at once, and is kept for the dates to come: the setting then reports it back, unchanged.
    OrderPicked: ({ order }) => (state) =>
      state._tag === 'Dating' && Opt.isSome(state.form.maybeOrder) && !Opt.contains(state.form.maybeOrder, order)
        ? {
          state: withForm(state, (form) => ({ ...form, maybeOrder: Opt.some(order) })),
          commands: [Command.KeepOrder({ order })],
        }
        : Tea.reject,

    TimeChanged: ({ now }) => (state) => ({ state: withForm(state, (form) => ({ ...form, maybeNow: Opt.some(now) })) }),

    // The day picked stays, while the digits still name it in the new order.
    OrderChanged: ({ order }) => (state) => ({
      state: withForm(state, (form) => ({ ...form, maybeOrder: Opt.some(order) })),
    }),

    // The door stays open while another product is on its way.
    Arrived: ({ id }) => (state) => {
      const { fridge } = state.form
      const maybeArrival = fridge._tag === 'Open'
        ? Arr.findFirst(fridge.arrivals, (arrival) => arrival.id === id)
        : Opt.none()
      if (fridge._tag !== 'Open' || Opt.isNone(maybeArrival)) {
        return Tea.defect('Arrived for a product not on its way: its timer runs only while it is, keyed by its id')
      }
      const arrivals = Arr.filter(fridge.arrivals, (arrival) => arrival.id !== id)
      const next: Fridge = Arr.isReadonlyArrayNonEmpty(arrivals)
        ? { ...fridge, arrivals }
        : { _tag: 'Closing', visit: fridge.visit, last: maybeArrival.value }
      return { state: withForm(state, (form) => ({ ...form, fridge: next })) }
    },

    FridgeClosed: ({ id }) => (state) =>
      state.form.fridge._tag === 'Closing' && state.form.fridge.last.id === id
        ? { state: withForm(state, (form) => ({ ...form, fridge: { _tag: 'Away' } })) }
        : Tea.defect(
          'FridgeClosed while the fridge is not closing behind that product: its timer runs only while it is',
        ),

    // The order picked stays in use for this visit either way: only the failure to keep it is told.
    OrderKept: ({ succeeded }) => (state) =>
      succeeded
        ? { state }
        : { state: withForm(state, told('OrderNotKept')), commands: [Command.Vibrate({ feedback: 'Reject' })] },

    SnackbarExpired: () => (state) =>
      state.form.snackbar._tag === 'Shown'
        ? { state: withForm(state, (form) => ({ ...form, snackbar: { _tag: 'None' } })) }
        : Tea.defect('SnackbarExpired while no snackbar is shown: the timer runs only while one is'),

    // The first barcode read closes the scanner, with a vibration: the phone is pointed at the product, not
    // looked at. The name is emptied, drawn anew: nothing is added under it before the user has seen the answer.
    // Scanning again is how a failed lookup is retried.
    Scanned: ({ barcode }) => (state) =>
      isScanning(state)
        ? {
          state: {
            _tag: 'LookingUp',
            form: {
              ...state.form,
              maybeName: Opt.none(),
              replacements: state.form.replacements + 1,
              lookup: { _tag: 'Idle' },
            },
            barcode,
          },
          commands: [Command.Vibrate({ feedback: 'Confirm' })],
        }
        : Tea.defect('Scanned while the camera is off: only the scanner reads it, until it fails'),

    // A product found names it, drawn anew and focused; otherwise the name stays empty, for the user to type.
    LookedUp: ({ barcode, outcome }) => (state) => {
      if (state._tag !== 'LookingUp' || state.barcode !== barcode) {
        return Tea.defect(
          'LookedUp for a barcode that is not being looked up: only the lookup subscription sends it, while its key is in the state',
        )
      }
      const { form } = state
      return {
        state: {
          _tag: 'Naming',
          form: Match.valueTags(outcome, {
            Found: ({ name, url }): Form => ({
              ...form,
              maybeName: Opt.some(name),
              replacements: form.replacements + 1,
              lookup: { _tag: 'Found', url },
            }),
            NotFound: (): Form => ({ ...form, lookup: { _tag: 'NotFound', barcode } }),
            Failed: (): Form => ({ ...form, lookup: { _tag: 'Failed' } }),
          }),
        },
      }
    },

    // The lookup stops: the runtime interrupts its subscription, whose answer never arrives. The name stays
    // empty.
    LookupCancelled: () => (state) =>
      state._tag === 'LookingUp' ? { state: { _tag: 'Naming', form: state.form } } : Tea.reject,

    // The scanner stays open, saying why it cannot read, until the user closes it: a dialog that vanished by
    // itself would say nothing.
    CameraFailed: () => (state) =>
      isScanning(state)
        ? {
          state: withForm(state, (form) => ({ ...form, camera: 'Unavailable' })),
          commands: [Command.Vibrate({ feedback: 'Reject' })],
        }
        : Tea.defect('CameraFailed while the camera is off: only the scanner reads it, until it fails'),

    // The check of an earlier opening of the page may answer too (opened, left and opened again before it did):
    // once the camera is known, a late answer changes nothing.
    CameraChecked: ({ isAvailable }) => (state) =>
      state.form.camera === 'Checking'
        ? { state: withForm(state, (form) => ({ ...form, camera: isAvailable ? 'Available' : 'Unavailable' })) }
        : Tea.reject,

    Started: () => (state) => state._tag === 'Naming' || state._tag === 'Dating' ? start(state) : Tea.reject,

    // The next product starts at the name, kept (a second package may be next) and drawn anew, so that it takes
    // the focus back from the button.
    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return Tea.defect('Completed while no product is being added: only a completion leaves Submitting')
      }
      const { form } = state
      return succeeded
        ? {
          state: {
            _tag: 'Naming',
            form: {
              ...form,
              replacements: form.replacements + 1,
              added: form.added + 1,
              fridge: admitted(form.fridge, form.added, state.product),
            },
          },
          commands: [Command.Vibrate({ feedback: 'Confirm' })],
        }
        : {
          state: resume(state.step, told('AddFailed')(form)),
          commands: [Command.Vibrate({ feedback: 'Reject' })],
        }
    },

    // Each press asks the parent to leave, which removes the page on the first one. Leaving while the barcode is
    // looked up interrupts the lookup, with the page.
    Closed: () => (state) =>
      state._tag === 'Naming' || state._tag === 'LookingUp' ? { state, events: [Event.LeaveRequested()] } : Tea.reject,

    // Closes the scanner or the second step first, then leaves the page. The page is not left while a product is
    // being added.
    BackPressed: () => (state) =>
      state._tag === 'Naming' || state._tag === 'LookingUp'
        ? { state, events: [Event.LeaveRequested()] }
        : state._tag === 'Scanning' || state._tag === 'Dating'
        ? { state: { _tag: 'Naming', form: state.form } }
        : { state },
  }),

  runCommand: Match.typeTags<Command>()({
    CheckCamera: checkCamera,
    Add: add,
    KeepOrder: keepOrder,
    Vibrate: vibrate,
  }),

  // The camera starts anew with each opening of the scanner: the scanner reports a barcode once, so this is what
  // lets the same product be read again.
  subscriptions: (state) => {
    const always: ReadonlyArray<readonly [Key, Tea.Subscription<Message, Deps>]> = [
      ['clock', clock],
      ['date-order', dateOrder],
      ['back-button', backButton],
    ]
    const scanning: typeof always = isScanning(state) ? [['scanner', scanner]] : []
    const looking: typeof always = state._tag === 'LookingUp'
      ? [[`lookup:${state.barcode}`, lookup(state.barcode)]]
      : []
    const entering: typeof always = Match.valueTags(state.form.fridge, {
      Away: (): typeof always => [],
      Open: ({ arrivals }): typeof always =>
        arrivals.map((arrival) => [['arriving', arrival.id] as const, arrivalTimer(arrival)]),
      Closing: ({ last }): typeof always => [[['closing', last.id] as const, closingTimer(last.id)]],
    })
    const telling: typeof always = state.form.snackbar._tag === 'Shown'
      ? [[['snackbar', state.form.snackbar.id] as const, snackbarTimer]]
      : []
    return HashMap.fromIterable([...always, ...scanning, ...looking, ...entering, ...telling])
  },

  makeModel: (state): Model => {
    const { form } = state
    const name = Opt.getOrElse(form.maybeName, () => '')
    // A lookup's text comes from a scan, which needs the camera: it wins when the camera failed on a later opening.
    const supporting: Supporting = state._tag === 'LookingUp'
      ? { _tag: 'LookingUp', barcode: state.barcode }
      : Match.valueTags(form.lookup, {
        Idle: (): Supporting => form.camera === 'Unavailable' ? { _tag: 'CameraUnavailable' } : { _tag: 'Nothing' },
        Found: ({ url }): Supporting => ({ _tag: 'FromOpenFoodFacts', url }),
        NotFound: ({ barcode }): Supporting => ({ _tag: 'NotOnOpenFoodFacts', barcode }),
        Failed: (): Supporting => ({ _tag: 'LookupFailed' }),
      })
    const nameShown: NameShown = { supporting, name, nameKey: form.replacements, snackbar: form.snackbar }
    const dateShown = (
      date: DateForm,
      maybeChoose: (day: Day.Day) => Opt.Option<Message>,
      maybePick: (order: DateOrder.DateOrder) => Opt.Option<Message>,
    ): DateShown => {
      const maybeNamed = maybeNamedDate(form, date)
      const choices = offeredDates(form, date).map((day): DateChoice => ({
        date: day,
        choice: Opt.contains(maybeNamed, day) ? { _tag: 'Chosen' } : { _tag: 'Offered', maybeChoose: maybeChoose(day) },
      }))
      const order: DateShown['order'] = Opt.match(form.maybeOrder, {
        onNone: () => ({ _tag: 'Unknown' }),
        onSome: (current) => ({
          _tag: 'Known',
          order: current,
          choices: Arr.map(DateOrder.all, (order): OrderChoice => ({
            order,
            choice: order === current ? { _tag: 'Current' } : { _tag: 'Offered', maybePick: maybePick(order) },
          })),
        }),
      })
      return {
        name,
        order,
        digits: date.digits,
        strip: Arr.isReadonlyArrayNonEmpty(choices)
          ? { _tag: 'Naming', choices }
          : date.digits === '' || canCompleteDate(form, date)
          ? { _tag: 'Hint' }
          : { _tag: 'NamingNothing' },
      }
    }
    return Match.valueTags(state, {
      // Both ways out need the product the name describes, never expiring: the date is that product's.
      Naming: (naming): Model => ({
        _tag: 'Naming',
        ...nameShown,
        close: Message.Closed(),
        changeName: (name: string) => Message.NameChanged({ name }),
        maybeClearName: hasName(form) ? Opt.some(Message.NameCleared()) : Opt.none(),
        maybeScan: form.camera === 'Available' ? Opt.some(Message.ScanRequested()) : Opt.none(),
        maybeRequestDate: Opt.map(productOfStep(naming), () => Message.DateRequested()),
        maybeAdd: Opt.map(productOfStep(naming), () => Message.Started()),
        fridge: fridgeShown(form),
      }),
      LookingUp: (): Model => ({
        _tag: 'LookingUp',
        ...nameShown,
        close: Message.Closed(),
        cancelLookup: Message.LookupCancelled(),
      }),
      Scanning: (): Model => ({
        _tag: 'Scanning',
        ...nameShown,
        camera: form.camera,
        closeScanner: Message.ScanClosed(),
      }),
      Dating: (dating): Model => {
        const { date } = dating
        return {
          _tag: 'Dating',
          ...nameShown,
          ...dateShown(
            date,
            (day) => Opt.some(Message.DateChosen({ date: day })),
            (order) => Opt.some(Message.OrderPicked({ order })),
          ),
          back: Message.DateDismissed(),
          // A key is there exactly where its rule applies: every digit applies, or none does.
          maybeTypeDigit: Opt.map(
            DigitDateEntry.typeDigit('0')(date),
            () => (digit: Digit) => Message.DigitTyped({ digit }),
          ),
          maybeEraseDigit: Opt.map(DigitDateEntry.eraseDigit(date), () => Message.DigitErased()),
          maybeClearDate: Opt.map(DigitDateEntry.clear(date), () => Message.DateCleared()),
          maybeAdd: Opt.map(productOfStep(dating), () => Message.Started()),
        }
      },
      Submitting: ({ step }): Model => ({
        _tag: 'Adding',
        ...nameShown,
        step: step._tag === 'Naming'
          ? { _tag: 'Naming', fridge: fridgeShown(form) }
          : { _tag: 'Dating', ...dateShown(step.date, () => Opt.none(), () => Opt.none()) },
      }),
    })
  },
}
