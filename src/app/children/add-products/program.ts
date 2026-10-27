// The page that adds products one after another, in two steps. First the name, typed or read from a barcode in
// the scanner's dialog (which names the product for now): from there the product is added as it is, never
// expiring, or the user goes on to its expiration date. Then the date: the keypad types its digits, read in the
// order the user keeps (day, month or year first, the device's locale's until they pick one), and the
// user picks, among the days they can name, the one they meant, and adds the product. Adding is a state that
// only its completion leaves; the page then starts at the name again, kept for the next product, with a snackbar
// whose action adds the same product again, until the user leaves it; the action is withheld while the step's own
// button would add the same product. The scanner is offered once the page knows the device can read barcodes,
// and the camera runs only while its dialog is open.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { Notifications } from '#infrastructure/notifications/notifications.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { defect } from '#libs/defect/defect.ts'
import * as AddProducts from './services/add-products/add-products.ts'
import { DateOrderSetting } from './services/date-order-setting/date-order-setting.ts'
import { Scanner } from './services/scanner/scanner.ts'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/**
 * Whether the device can read barcodes: asked when the page opens, until the answer comes; unavailable from then
 * on, too, once the camera has failed. It is not tried again until the page is opened anew.
 */
export type Camera = 'Checking' | 'Available' | 'Unavailable'

/** What is kept in every state: a product being added does not interrupt the next one. */
export type Form = Readonly<{
  maybeName: Opt.Option<string>
  /**
   * How many times the name's input was drawn anew, and focused: with each scan or clearing that replaced the
   * name, and with each product added from a step, the next starting at the name.
   */
  replacements: number
  camera: Camera
  /** The current time, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Utc>
  /** The order the digits of a date are read in, once the setting has been read. */
  maybeOrder: Opt.Option<DateOrder.DateOrder>
  maybeLastAdded: Opt.Option<Product.Product>
}>

/** The expiration date being typed: it exists only in the second step, and starts anew with each. */
export type DateForm = Readonly<{
  /** Typed on the keypad, at most `DigitDates.MAX_DIGITS`. */
  digits: string
  /** The day picked among those the digits name, until a digit is typed, erased or cleared. */
  maybeChosenDate: Opt.Option<DateTime.Utc>
}>

/** The step a product is being added from, to come back to. */
export type Step = Data.TaggedEnum<{
  Naming: object
  Dating: Readonly<{ date: DateForm }>
}>

export type State = Data.TaggedEnum<{
  /** The first step: the name. */
  Naming: Readonly<{ form: Form }>
  /** The scanner's dialog is open, over the first step: it says so if the camera fails meanwhile. */
  Scanning: Readonly<{ form: Form }>
  /** The second step: the expiration date. */
  Dating: Readonly<{ form: Form; date: DateForm }>
  /**
   * The product is being added, from a step's button, after which the next product starts at the name, or from
   * the snackbar, which leaves the step as it is.
   */
  Submitting: Readonly<{ form: Form; product: Product.Product; step: Step; from: 'Form' | 'Snackbar' }>
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
  /** The first step's "Set the expiration": goes on to the second step. */
  DateRequested: object
  /** The second step's back arrow: back to the name, the date forgotten. */
  DateDismissed: object
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** The keypad's clear key: erases every digit. */
  DateCleared: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: DateTime.Utc }
  /** The second step's segmented button: the order the digits are read in, kept for every date to come. */
  OrderPicked: { order: DateOrder.DateOrder }
  /** Adds the product the step describes: never expiring from the first, expiring on the day named from the second. */
  Started: object
  /** The snackbar's "Add another": adds the product added last again, created now. */
  Repeated: object
  /** The page's close button, on the first step. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  /** The order kept: the setting reports it when the page opens, and after every pick. */
  OrderChanged: { order: DateOrder.DateOrder }
  Scanned: { barcode: string }
  CameraFailed: object
  /** The platform's back button, while the page is shown. */
  BackPressed: object
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
  ShowToast: { text: string }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps = AddProducts.AddProducts | DateOrderSetting | Scanner | Notifications | BackButton

/** A day the digits name: the one the product expires on, or one to pick instead, while the step takes it. */
export type DateChoice = Readonly<{
  date: DateTime.Utc
  choice: Data.TaggedEnum<{ Chosen: object; Offered: Readonly<{ maybeChoose: Opt.Option<Message> }> }>
}>

/** An order the digits can be read in: the one in use, or one to pick instead, while the step takes it. */
export type OrderChoice = Readonly<{
  order: DateOrder.DateOrder
  choice: Data.TaggedEnum<{ Current: object; Offered: Readonly<{ maybePick: Opt.Option<Message> }> }>
}>

/** The first step, drawn in every state: under the scanner, and under the second step. */
export type NameShown = Readonly<{
  /** Once unavailable, the name field and the scanner say that the name can only be typed. */
  camera: Camera
  name: string
  /** Changes when the name is replaced by a scan or a clearing, or a product was added, not by typing. */
  nameKey: number
}>

/**
 * The second step, over the first: the product's name as its heading, the order the digits are read in, the
 * date's field and its strip.
 */
export type DateShown = Readonly<{
  name: string
  /**
   * The segmented button of the orders, the one in use selected, and what the field and the hint say the digits
   * are read in; nothing until the setting has been read, a moment after the page opens.
   */
  order: Data.TaggedEnum<{
    Unknown: object
    Known: Readonly<{ order: DateOrder.DateOrder; choices: Arr.NonEmptyReadonlyArray<OrderChoice> }>
  }>
  /** The date's field: the digits as typed. */
  digits: string
  /**
   * The strip between the field and the keypad: how to type a date, the days the digits name, in order (the one
   * chosen being the product's), or that they name none.
   */
  strip: Data.TaggedEnum<{
    Hint: object
    Naming: Readonly<{ choices: Arr.NonEmptyReadonlyArray<DateChoice> }>
    NamingNothing: object
  }>
}>

/**
 * The snackbar: the product added last, for a few seconds after it was added, with its action, unless the step's
 * own button would add the same product.
 */
export type JustAdded = Readonly<{ product: Product.Product; maybeRepeat: Opt.Option<Message> }>

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
      maybeJustAdded: Opt.Option<JustAdded>
    }>
  /** The scanner's dialog, over the first step, which takes nothing until it closes. */
  Scanning: NameShown & Readonly<{ closeScanner: Message }>
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
      maybeJustAdded: Opt.Option<JustAdded>
    }>
  /** The product is being added: the step it is added from, its controls disabled; the snackbar has no action. */
  Adding:
    & NameShown
    & Readonly<{
      step: Data.TaggedEnum<{ Naming: object; Dating: DateShown }>
      maybeJustAdded: Opt.Option<Product.Product>
    }>
}>

// Material's snackbar stays from 4 to 10 seconds: with an action, long enough to tap it once the first package
// is put away.
const SNACKBAR_SECONDS = 6

/** Whether `product` was added a moment ago: it is created when it is added. */
const isJustAdded = (product: Product.Product, maybeNow: Opt.Option<DateTime.Utc>) =>
  Opt.exists(
    maybeNow,
    (now) => DateTime.isLessThan(now, DateTime.add(product.creationDate, { seconds: SNACKBAR_SECONDS })),
  )

/** Whether the camera is read: while the scanner is open, until it fails. */
const isScanning = (state: State) => state._tag === 'Scanning' && state.form.camera === 'Available'

const hasName = (form: Form) => Opt.exists(form.maybeName, (name) => name !== '')

/** The same state, with its form changed. */
const withForm = (state: State, change: (form: Form) => Form): State => ({ ...state, form: change(state.form) })

/** The second step, with its date changed. */
const withDate = (state: State & { _tag: 'Dating' }, change: (date: DateForm) => DateForm): State => ({
  ...state,
  date: change(state.date),
})

/** The step a product is added from, and comes back to. */
const stepOf = (state: State & { _tag: 'Naming' | 'Dating' }): Step =>
  state._tag === 'Naming' ? { _tag: 'Naming' } : { _tag: 'Dating', date: state.date }

/** Back to the step a product was added from. */
const resume = (step: Step, form: Form): State =>
  step._tag === 'Naming' ? { _tag: 'Naming', form } : { _tag: 'Dating', form, date: step.date }

/** The days the digits name, read in the order in use, on which a product added now may expire. */
const datesOf = (form: Form, date: DateForm): ReadonlyArray<DateTime.Utc> =>
  Opt.match(Opt.all([form.maybeNow, form.maybeOrder]), {
    onNone: () => [],
    onSome: ([now, order]) => DigitDates.datesOf(date.digits, now, order).filter(Product.canExpireOn(now)),
  })

const isAmong = (dates: ReadonlyArray<DateTime.Utc>) => (date: DateTime.Utc) =>
  dates.some((offered) => DateTime.Equivalence(offered, date))

/** The day the digits name: the one picked, while they still name it, or else the only one they name. */
const maybeNamedDate = (form: Form, date: DateForm): Opt.Option<DateTime.Utc> => {
  const offered = datesOf(form, date)
  return Opt.orElse(
    Opt.filter(date.maybeChosenDate, isAmong(offered)),
    () => offered.length === 1 ? Arr.head(offered) : Opt.none(),
  )
}

/** The product the form names, created now, with that expiration, if it is one. */
const productOf = (form: Form, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

/** The product a step describes: never expiring from the first, expiring on the day named from the second. */
const productOfStep = (state: State & { _tag: 'Naming' | 'Dating' }) =>
  state._tag === 'Naming'
    ? productOf(state.form, Opt.none())
    : Opt.flatMap(maybeNamedDate(state.form, state.date), (date) => productOf(state.form, Opt.some(date)))

/** Whether two products added now would be the same product: a name and an expiration, created at the same time. */
const isSameProduct = (one: Product.Product, other: Product.Product) =>
  one.name === other.name
  && Opt.makeEquivalence(DateTime.Equivalence)(one.maybeExpirationDate, other.maybeExpirationDate)

/**
 * The product added last, again, created now, while its snackbar shows: none once its expiration has meanwhile
 * passed (a product expiring today, repeated after midnight).
 */
const repeatOf = (form: Form) =>
  Opt.flatMap(
    Opt.all([Opt.filter(form.maybeLastAdded, (product) => isJustAdded(product, form.maybeNow)), form.maybeNow]),
    ([{ name, maybeExpirationDate }, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

// Refreshed often, so that the creation date is close to when the user adds the product.
const clock = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('1 second'))),
  ),
)

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

const showToast = Effect.fn('ShowToast')(
  function*({ text }: Readonly<{ text: string }>) {
    const { showToast } = yield* Notifications
    yield* showToast(text).pipe(
      Effect.catchTag('NotificationError', (error) => Effect.logWarning('Could not show toast', error.cause)),
    )
    return Opt.none()
  },
  Effect.withLogSpan('ShowToast'),
)

/** Adds the product a step describes, when it describes one. */
const start = (state: State & { _tag: 'Naming' | 'Dating' }): Tea.Transition<State, Command, Event> =>
  Opt.match(productOfStep(state), {
    onNone: () => Tea.reject,
    onSome: (product) => ({
      state: { _tag: 'Submitting', form: state.form, product, step: stepOf(state), from: 'Form' },
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
        maybeNow: Opt.none(),
        maybeOrder: Opt.none(),
        maybeLastAdded: Opt.none(),
      },
    },
    commands: [Command.CheckCamera()],
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted under the scanner, the second step and while submitting too, where the input is covered or
    // disabled: a key typed just before is kept. The raw text is kept as typed; whether it is a valid name is
    // decided when going on or adding.
    NameChanged: ({ name }) => (state) => ({
      state: withForm(state, (form) => ({ ...form, maybeName: Opt.some(name) })),
    }),

    // The input is drawn anew, empty: the user owns its text until the program replaces it.
    NameCleared: () => (state) =>
      state._tag === 'Naming' && hasName(state.form)
        ? {
          state: withForm(state, (form) => ({ ...form, maybeName: Opt.none(), replacements: form.replacements + 1 })),
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
        ? { state: { _tag: 'Dating', form: state.form, date: { digits: '', maybeChosenDate: Opt.none() } } }
        : Tea.reject,

    DateDismissed: () => (state) =>
      state._tag === 'Dating' ? { state: { _tag: 'Naming', form: state.form } } : Tea.reject,

    // New digits name other days: the day picked goes with the old ones.
    DigitTyped: ({ digit }) => (state) =>
      state._tag === 'Dating' && state.date.digits.length < DigitDates.MAX_DIGITS
        ? {
          state: withDate(state, (date) => ({ digits: date.digits + digit, maybeChosenDate: Opt.none() })),
        }
        : Tea.reject,

    DigitErased: () => (state) =>
      state._tag === 'Dating' && state.date.digits !== ''
        ? {
          state: withDate(state, (date) => ({ digits: date.digits.slice(0, -1), maybeChosenDate: Opt.none() })),
        }
        : Tea.reject,

    DateCleared: () => (state) =>
      state._tag === 'Dating' && state.date.digits !== ''
        ? { state: withDate(state, () => ({ digits: '', maybeChosenDate: Opt.none() })) }
        : Tea.reject,

    // Only a day the digits name, and not the one the form already names: a tap on the chosen chip does nothing.
    DateChosen: ({ date }) => (state) =>
      state._tag === 'Dating' && isAmong(datesOf(state.form, state.date))(date)
        && !Opt.contains(maybeNamedDate(state.form, state.date), date)
        ? { state: withDate(state, (typed) => ({ ...typed, maybeChosenDate: Opt.some(date) })) }
        : Tea.reject,

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

    // The order picked stays in use for this visit either way: only the failure to keep it is told.
    OrderKept: ({ succeeded }) => (state) =>
      succeeded ? { state } : { state, commands: [Command.ShowToast({ text: 'Could not keep the date format' })] },

    // The first barcode read closes the scanner, on the first step: whether the product expires is still to be
    // said.
    Scanned: ({ barcode }) => (state) => {
      if (!isScanning(state)) {
        return defect('Scanned while the camera is off: only the scanner reads it, until it fails')
      }
      const form = Opt.contains(state.form.maybeName, barcode)
        ? state.form
        : { ...state.form, maybeName: Opt.some(barcode), replacements: state.form.replacements + 1 }
      return { state: { _tag: 'Naming', form } }
    },

    // The scanner stays open, saying why it cannot read, until the user closes it: a dialog that vanished by
    // itself would say nothing.
    CameraFailed: () => (state) =>
      isScanning(state)
        ? { state: withForm(state, (form) => ({ ...form, camera: 'Unavailable' })) }
        : defect('CameraFailed while the camera is off: only the scanner reads it, until it fails'),

    // The check of an earlier opening of the page may answer too (opened, left and opened again before it did):
    // once the camera is known, a late answer changes nothing.
    CameraChecked: ({ isAvailable }) => (state) =>
      state.form.camera === 'Checking'
        ? { state: withForm(state, (form) => ({ ...form, camera: isAvailable ? 'Available' : 'Unavailable' })) }
        : Tea.reject,

    Started: () => (state) => state._tag === 'Naming' || state._tag === 'Dating' ? start(state) : Tea.reject,

    Repeated: () => (state) =>
      state._tag === 'Naming' || state._tag === 'Dating'
        ? Opt.match(repeatOf(state.form), {
          onNone: () => Tea.reject,
          onSome: (product) => ({
            state: { _tag: 'Submitting', form: state.form, product, step: stepOf(state), from: 'Snackbar' },
            commands: [Command.Add({ product })],
          }),
        })
        : Tea.reject,

    // After a step's product, the next one starts at the name, this one's, drawn anew so that it takes the focus
    // the button took: a second package of it may be next. After the snackbar's, the step goes on as it was: the
    // digits typed meanwhile are the next product's.
    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return defect('Completed while no product is being added: only a completion leaves Submitting')
      }
      const form = { ...state.form, maybeLastAdded: Opt.some(state.product) }
      return succeeded
        ? {
          state: state.from === 'Form'
            ? { _tag: 'Naming', form: { ...form, replacements: form.replacements + 1 } }
            : resume(state.step, form),
        }
        : {
          state: resume(state.step, state.form),
          commands: [Command.ShowToast({ text: 'Could not add the product' })],
        }
    },

    // Each press asks the parent to leave, which removes the page on the first one.
    Closed: () => (state) => state._tag === 'Naming' ? { state, events: [Event.LeaveRequested()] } : Tea.reject,

    // Closes the scanner or the second step first, then leaves the page. The page is not left while a product is
    // being added.
    BackPressed: () => (state) =>
      state._tag === 'Naming'
        ? { state, events: [Event.LeaveRequested()] }
        : state._tag === 'Scanning' || state._tag === 'Dating'
        ? { state: { _tag: 'Naming', form: state.form } }
        : { state },
  }),

  runCommand: Match.typeTags<Command>()({
    CheckCamera: checkCamera,
    Add: add,
    KeepOrder: keepOrder,
    ShowToast: showToast,
  }),

  // The camera starts anew with each opening of the scanner: the scanner reports a barcode once until another,
  // so this is what makes the same product readable again.
  subscriptions: (state) =>
    isScanning(state)
      ? HashMap.make(['clock', clock], ['date-order', dateOrder], ['scanner', scanner], ['back-button', backButton])
      : HashMap.make(['clock', clock], ['date-order', dateOrder], ['back-button', backButton]),

  makeModel: (state): Model => {
    const { form } = state
    const name = Opt.getOrElse(form.maybeName, () => '')
    const nameShown: NameShown = { camera: form.camera, name, nameKey: form.replacements }
    const dateShown = (
      date: DateForm,
      maybeChoose: (day: DateTime.Utc) => Opt.Option<Message>,
      maybePick: (order: DateOrder.DateOrder) => Opt.Option<Message>,
    ): DateShown => {
      const maybeNamed = maybeNamedDate(form, date)
      const choices = datesOf(form, date).map((day): DateChoice => ({
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
        strip: date.digits === ''
          ? { _tag: 'Hint' }
          : Arr.isReadonlyArrayNonEmpty(choices)
          ? { _tag: 'Naming', choices }
          : { _tag: 'NamingNothing' },
      }
    }
    const maybeJustAdded = Opt.filter(form.maybeLastAdded, (product) => isJustAdded(product, form.maybeNow))
    // The action is withheld while it would add what the step's button adds: after a product added as it is, the
    // name stays, and "Add without expiration" adds it again; after the snackbar's, the second step keeps its
    // digits, which may still name the same day.
    const justAdded = (maybeStepProduct: Opt.Option<Product.Product>) =>
      Opt.map(maybeJustAdded, (product): JustAdded => ({
        product,
        maybeRepeat: pipe(
          repeatOf(form),
          Opt.filter((repeat) => !Opt.exists(maybeStepProduct, (stepProduct) => isSameProduct(repeat, stepProduct))),
          Opt.map(() => Message.Repeated()),
        ),
      }))
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
        maybeJustAdded: justAdded(productOfStep(naming)),
      }),
      Scanning: (): Model => ({ _tag: 'Scanning', ...nameShown, closeScanner: Message.ScanClosed() }),
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
          maybeTypeDigit: date.digits.length < DigitDates.MAX_DIGITS
            ? Opt.some((digit: Digit) => Message.DigitTyped({ digit }))
            : Opt.none(),
          maybeEraseDigit: date.digits !== '' ? Opt.some(Message.DigitErased()) : Opt.none(),
          maybeClearDate: date.digits !== '' ? Opt.some(Message.DateCleared()) : Opt.none(),
          maybeAdd: Opt.map(productOfStep(dating), () => Message.Started()),
          maybeJustAdded: justAdded(productOfStep(dating)),
        }
      },
      Submitting: ({ step }): Model => ({
        _tag: 'Adding',
        ...nameShown,
        step: step._tag === 'Naming'
          ? { _tag: 'Naming' }
          : { _tag: 'Dating', ...dateShown(step.date, () => Opt.none(), () => Opt.none()) },
        maybeJustAdded,
      }),
    })
  },
}
