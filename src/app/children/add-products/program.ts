// The page that adds products one after another: the name is typed, or read from a barcode in the scanner's
// dialog (which names the product for now), the keypad types the digits of its expiration date, and the user
// picks, among the days the digits can name, the one they meant (or none: no digits, no expiration), then adds the
// product. Adding is a state that only its completion leaves; the page then stays, with the name, for the next
// product, and a snackbar whose action adds the same product again, until the user leaves it. The scanner is
// offered once the page knows the device can read barcodes, and the camera runs only while its dialog is open.
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
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { defect } from '#libs/defect/defect.ts'
import * as AddProducts from './services/add-products/add-products.ts'
import { Scanner } from './services/scanner/scanner.ts'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/**
 * Whether the device can read barcodes: asked when the page opens, until the answer comes; unavailable from then
 * on, too, once the camera has failed. It is not tried again until the page is opened anew.
 */
export type Camera = 'Checking' | 'Available' | 'Unavailable'

/** What the user has entered, kept in every state: a product being added does not interrupt the next one. */
export type Form = Readonly<{
  maybeName: Opt.Option<string>
  /** How many times a scan or a clearing replaced the name: the name's input is drawn anew with each. */
  replacements: number
  /** Typed on the keypad, at most `DigitDates.MAX_DIGITS`. */
  digits: string
  /** The day picked among those the digits name, until a digit is typed or erased. */
  maybeChosenDate: Opt.Option<DateTime.Utc>
  camera: Camera
  /** The current time, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Utc>
  maybeLastAdded: Opt.Option<Product.Product>
}>

export type State = Data.TaggedEnum<{
  Editing: Readonly<{ form: Form }>
  /** The scanner's dialog is open, over the form: it says so if the camera fails meanwhile. */
  Scanning: Readonly<{ form: Form }>
  /**
   * The product is being added, from the form, which then starts anew, or from the snackbar, which leaves the
   * form, already the next product's, as it is.
   */
  Submitting: Readonly<{ form: Form; product: Product.Product; from: 'Form' | 'Snackbar' }>
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
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: DateTime.Utc }
  /** Adds the product the form describes: named, expiring on the day it names, or never when no digit is typed. */
  Started: object
  /** The snackbar's "Add another": adds the product added last again, created now. */
  Repeated: object
  /** The page's close button. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  Scanned: { barcode: string }
  CameraFailed: object
  /** The platform's back button, while the page is shown. */
  BackPressed: object
  // From commands.
  CameraChecked: { isAvailable: boolean }
  Completed: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  /** Asks whether the device can read barcodes. */
  CheckCamera: object
  /** Adds a product that `update` has already validated. */
  Add: { product: Product.Product }
  ShowToast: { text: string }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
}>

const Event = Data.taggedEnum<Event>()

export type Deps = AddProducts.AddProducts | Scanner | Notifications | BackButton

/** A day the digits name: the one the product expires on, or one to pick instead. */
export type DateChoice = Readonly<{
  date: DateTime.Utc
  choice: Data.TaggedEnum<{ Chosen: object; Offered: Readonly<{ choose: Message }> }>
}>

/** What the typed digits say of the expiration date. */
export type DateField = Data.TaggedEnum<{
  /** No digit typed: the product never expires. */
  Undated: object
  /** The digits name these days, in order. */
  Naming: Readonly<{ choices: Arr.NonEmptyReadonlyArray<DateChoice> }>
  /** The digits name no day ahead. */
  NamingNothing: object
}>

/** What the form draws in every case. */
type Shown = Readonly<{
  /** Once unavailable, the name field and the scanner say that the name can only be typed. */
  camera: Camera
  name: string
  /** Changes when the name is replaced by a scan or a clearing, not by typing. */
  nameKey: number
  /** The date's field: the digits as typed. */
  digits: string
  /** The date field's supporting text: how to type a date, the day the form names, or that the digits name none. */
  support: Data.TaggedEnum<{
    Hint: object
    Named: Readonly<{ date: DateTime.Utc }>
    NamingNothing: object
  }>
  /** The keypad's keys: none but while editing, or past a date's longest. */
  maybeTypeDigit: Opt.Option<(digit: Digit) => Message>
  /** None but while editing, or with nothing to erase. */
  maybeEraseDigit: Opt.Option<Message>
}>

export type Model = Data.TaggedEnum<{
  Editing:
    & Shown
    & Readonly<{
      close: Message
      changeName: (name: string) => Message
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Message>
      /** Opens the scanner, once the device can read barcodes. */
      maybeScan: Opt.Option<Message>
      date: DateField
      /** Adds the product, once the form describes one. */
      maybeAdd: Opt.Option<Message>
      /** The snackbar: the product added last, with its action, for a few seconds after it was added. */
      maybeJustAdded: Opt.Option<Readonly<{ product: Product.Product; maybeRepeat: Opt.Option<Message> }>>
    }>
  /** The scanner's dialog, over the form, which takes nothing until it closes. */
  Scanning: Shown & Readonly<{ closeScanner: Message }>
  /** The controls are disabled until the product is added; the snackbar has no action. */
  Submitting: Shown & Readonly<{ maybeJustAdded: Opt.Option<Product.Product> }>
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

/** The days the digits name on which a product added now may expire. */
const datesOf = (form: Form): ReadonlyArray<DateTime.Utc> =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) => DigitDates.datesOf(form.digits, now).filter(Product.canExpireOn(now)),
  })

const isAmong = (dates: ReadonlyArray<DateTime.Utc>) => (date: DateTime.Utc) =>
  dates.some((offered) => DateTime.Equivalence(offered, date))

/** The day the digits name: the one picked, while they still name it, or else the only one they name. */
const maybeNamedDate = (form: Form): Opt.Option<DateTime.Utc> => {
  const offered = datesOf(form)
  return Opt.orElse(
    Opt.filter(form.maybeChosenDate, isAmong(offered)),
    () => offered.length === 1 ? Arr.head(offered) : Opt.none(),
  )
}

/** When the product expires: never with no digits, on the day they name, or nothing while they name none. */
const maybeExpirationOf = (form: Form): Opt.Option<Opt.Option<DateTime.Utc>> =>
  form.digits === '' ? Opt.some(Opt.none()) : Opt.map(maybeNamedDate(form), Opt.some)

/** The product the form describes, created now, if it is one. */
const productOf = (form: Form) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow, maybeExpirationOf(form)]),
    ([name, creationDate, maybeExpirationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

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
      _tag: 'Editing',
      form: {
        maybeName: Opt.none(),
        replacements: 0,
        digits: '',
        maybeChosenDate: Opt.none(),
        camera: 'Checking',
        maybeNow: Opt.none(),
        maybeLastAdded: Opt.none(),
      },
    },
    commands: [Command.CheckCamera()],
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted under the scanner and while submitting too, where the input is covered or disabled: a key typed
    // just before is kept. The raw text is kept as typed; whether it is a valid name is decided when adding.
    NameChanged: ({ name }) => (state) => ({
      state: withForm(state, (form) => ({ ...form, maybeName: Opt.some(name) })),
    }),

    // The input is drawn anew, empty: the user owns its text until the program replaces it.
    NameCleared: () => (state) =>
      state._tag === 'Editing' && hasName(state.form)
        ? {
          state: withForm(state, (form) => ({ ...form, maybeName: Opt.none(), replacements: form.replacements + 1 })),
        }
        : Tea.reject,

    ScanRequested: () => (state) =>
      state._tag === 'Editing' && state.form.camera === 'Available'
        ? { state: { _tag: 'Scanning', form: state.form } }
        : Tea.reject,

    ScanClosed: () => (state) =>
      state._tag === 'Scanning' ? { state: { _tag: 'Editing', form: state.form } } : Tea.reject,

    // New digits name other days: the day picked goes with the old ones.
    DigitTyped: ({ digit }) => (state) =>
      state._tag === 'Editing' && state.form.digits.length < DigitDates.MAX_DIGITS
        ? {
          state: withForm(state, (form) => ({ ...form, digits: form.digits + digit, maybeChosenDate: Opt.none() })),
        }
        : Tea.reject,

    DigitErased: () => (state) =>
      state._tag === 'Editing' && state.form.digits !== ''
        ? {
          state: withForm(state, (form) => ({
            ...form,
            digits: form.digits.slice(0, -1),
            maybeChosenDate: Opt.none(),
          })),
        }
        : Tea.reject,

    // Only a day the digits name, and not the one the form already names: a tap on the chosen chip does nothing.
    DateChosen: ({ date }) => (state) =>
      state._tag === 'Editing' && isAmong(datesOf(state.form))(date)
        && !Opt.contains(maybeNamedDate(state.form), date)
        ? { state: withForm(state, (form) => ({ ...form, maybeChosenDate: Opt.some(date) })) }
        : Tea.reject,

    TimeChanged: ({ now }) => (state) => ({ state: withForm(state, (form) => ({ ...form, maybeNow: Opt.some(now) })) }),

    // The first barcode read closes the scanner. Another barcode is another product, whose date is its own: the
    // digits and the day picked go with the old name.
    Scanned: ({ barcode }) => (state) => {
      if (!isScanning(state)) {
        return defect('Scanned while the camera is off: only the scanner reads it, until it fails')
      }
      const form = Opt.contains(state.form.maybeName, barcode)
        ? state.form
        : {
          ...state.form,
          maybeName: Opt.some(barcode),
          replacements: state.form.replacements + 1,
          digits: '',
          maybeChosenDate: Opt.none(),
        }
      return { state: { _tag: 'Editing', form } }
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

    Started: () => (state) =>
      state._tag === 'Editing'
        ? Opt.match(productOf(state.form), {
          onNone: () => Tea.reject,
          onSome: (product) => ({
            state: { _tag: 'Submitting', form: state.form, product, from: 'Form' },
            commands: [Command.Add({ product })],
          }),
        })
        : Tea.reject,

    Repeated: () => (state) =>
      state._tag === 'Editing'
        ? Opt.match(repeatOf(state.form), {
          onNone: () => Tea.reject,
          onSome: (product) => ({
            state: { _tag: 'Submitting', form: state.form, product, from: 'Snackbar' },
            commands: [Command.Add({ product })],
          }),
        })
        : Tea.reject,

    // After the form's product, the next one starts with no digits, and the name of this one: a second package of
    // it may be next. After the snackbar's, the digits typed meanwhile are the next product's: they stay.
    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return defect('Completed while no product is being added: only a completion leaves Submitting')
      }
      const added = { maybeLastAdded: Opt.some(state.product) }
      return succeeded
        ? {
          state: {
            _tag: 'Editing',
            form: state.from === 'Form'
              ? { ...state.form, ...added, digits: '', maybeChosenDate: Opt.none() }
              : { ...state.form, ...added },
          },
        }
        : {
          state: { _tag: 'Editing', form: state.form },
          commands: [Command.ShowToast({ text: 'Could not add the product' })],
        }
    },

    // Each press asks the parent to leave, which removes the page on the first one.
    Closed: () => (state) => state._tag === 'Editing' ? { state, events: [Event.LeaveRequested()] } : Tea.reject,

    // Closes the scanner first, then leaves the page. The page is not left while a product is being added.
    BackPressed: () => (state) =>
      state._tag === 'Editing'
        ? { state, events: [Event.LeaveRequested()] }
        : state._tag === 'Scanning'
        ? { state: { _tag: 'Editing', form: state.form } }
        : { state },
  }),

  runCommand: Match.typeTags<Command>()({
    CheckCamera: checkCamera,
    Add: add,
    ShowToast: showToast,
  }),

  // The camera starts anew with each opening of the scanner: the scanner reports a barcode once until another,
  // so this is what makes the same product readable again.
  subscriptions: (state) =>
    isScanning(state)
      ? HashMap.make(['clock', clock], ['scanner', scanner], ['back-button', backButton])
      : HashMap.make(['clock', clock], ['back-button', backButton]),

  makeModel: (state): Model => {
    const { form } = state
    const isEditing = state._tag === 'Editing'
    const offered = datesOf(form)
    const maybeNamed = maybeNamedDate(form)
    const shown: Shown = {
      camera: form.camera,
      name: Opt.getOrElse(form.maybeName, () => ''),
      nameKey: form.replacements,
      digits: form.digits,
      support: form.digits === ''
        ? { _tag: 'Hint' }
        : Opt.match(maybeNamed, {
          onSome: (date) => ({ _tag: 'Named', date }),
          onNone: () => Arr.isReadonlyArrayNonEmpty(offered) ? { _tag: 'Hint' } : { _tag: 'NamingNothing' },
        }),
      maybeTypeDigit: isEditing && form.digits.length < DigitDates.MAX_DIGITS
        ? Opt.some((digit: Digit) => Message.DigitTyped({ digit }))
        : Opt.none(),
      maybeEraseDigit: isEditing && form.digits !== '' ? Opt.some(Message.DigitErased()) : Opt.none(),
    }
    const maybeJustAdded = Opt.filter(form.maybeLastAdded, (product) => isJustAdded(product, form.maybeNow))
    if (state._tag === 'Scanning') {
      return { _tag: 'Scanning', ...shown, closeScanner: Message.ScanClosed() }
    }
    if (state._tag === 'Submitting') {
      return { _tag: 'Submitting', ...shown, maybeJustAdded }
    }
    const choices = offered.map((date): DateChoice => ({
      date,
      choice: Opt.contains(maybeNamed, date)
        ? { _tag: 'Chosen' }
        : { _tag: 'Offered', choose: Message.DateChosen({ date }) },
    }))
    return {
      _tag: 'Editing',
      ...shown,
      close: Message.Closed(),
      changeName: (name: string) => Message.NameChanged({ name }),
      maybeClearName: hasName(form) ? Opt.some(Message.NameCleared()) : Opt.none(),
      maybeScan: form.camera === 'Available' ? Opt.some(Message.ScanRequested()) : Opt.none(),
      date: form.digits === ''
        ? { _tag: 'Undated' }
        : Arr.isReadonlyArrayNonEmpty(choices)
        ? { _tag: 'Naming', choices }
        : { _tag: 'NamingNothing' },
      maybeAdd: Opt.map(productOf(form), () => Message.Started()),
      maybeJustAdded: Opt.map(maybeJustAdded, (product) => ({
        product,
        maybeRepeat: Opt.map(repeatOf(form), () => Message.Repeated()),
      })),
    }
  },
}
