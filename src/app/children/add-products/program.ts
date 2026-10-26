// The page that adds products one after another: the camera reads a product's barcode, which names it for now,
// the keypad types the digits of its expiration date, and the user picks, among the days the digits can name,
// the one they meant, which adds the product. Adding is a state that only its completion leaves; the page then
// stays, with the name, for the next product, until the user leaves it.
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

/** What the user has entered, kept in every state: a product being added does not interrupt the next one. */
export type Form = Readonly<{
  maybeName: Opt.Option<string>
  /** How many scans have replaced the name: the name's input is drawn anew with each. */
  scans: number
  /** Typed on the keypad, at most `DigitDates.MAX_DIGITS`. */
  digits: string
  /** Until the camera fails: then the name is typed. */
  isCameraOn: boolean
  /** The current time, once the clock has ticked: the product is created then. */
  maybeNow: Opt.Option<DateTime.Utc>
  maybeLastAdded: Opt.Option<Product.Product>
}>

export type State = Data.TaggedEnum<{
  Editing: Readonly<{ form: Form }>
  Submitting: Readonly<{ form: Form; product: Product.Product }>
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  NameChanged: { name: string }
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** Adds the product, expiring on one of the days the digits name, or never when no digit is typed. */
  Started: { maybeExpirationDate: Opt.Option<DateTime.Utc> }
  /** The page's close button, and the back button, while the page is shown. */
  BackPressed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  Scanned: { barcode: string }
  CameraFailed: object
  // From commands.
  Completed: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
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

/** A day the digits name, which adds the product once the form names one. */
export type DateChoice = Readonly<{ date: DateTime.Utc; maybeAdd: Opt.Option<Message> }>

/** What the typed digits say of the expiration date. */
export type DateField = Data.TaggedEnum<{
  /** No digit typed: the product may be added with no expiration date, once the form names one. */
  Undated: Readonly<{ maybeAddUndated: Opt.Option<Message> }>
  /** The digits name these days, in order. */
  Naming: Readonly<{ choices: Arr.NonEmptyReadonlyArray<DateChoice> }>
  /** The digits name no day ahead. */
  NamingNothing: object
}>

type Shown = Readonly<{
  isCameraOn: boolean
  name: string
  /** Changes when the name is replaced by a scan, not by typing. */
  nameKey: number
  /** The digits typed so far, once there are any. */
  maybeDigits: Opt.Option<string>
  /** The product added last, for a few seconds after it was added: the snackbar that says so. */
  maybeJustAdded: Opt.Option<Product.Product>
  /** The keypad's keys: none while a product is being added, or past a date's longest. */
  maybeTypeDigit: Opt.Option<(digit: Digit) => Message>
  /** None while a product is being added, or with nothing to erase. */
  maybeEraseDigit: Opt.Option<Message>
}>

export type Model = Data.TaggedEnum<{
  Editing:
    & Shown
    & Readonly<{
      close: Message
      changeName: (name: string) => Message
      date: DateField
    }>
  /** The controls are disabled until the product is added. */
  Submitting: Shown
}>

// Material's snackbar stays from 4 to 10 seconds: the shortest, as the next product is usually already in hand.
const SNACKBAR_SECONDS = 4

/** Whether `product` was added a moment ago: it is created when it is added. */
const isJustAdded = (product: Product.Product, maybeNow: Opt.Option<DateTime.Utc>) =>
  Opt.exists(
    maybeNow,
    (now) => DateTime.isLessThan(now, DateTime.add(product.creationDate, { seconds: SNACKBAR_SECONDS })),
  )

/** The same state, with its form changed. */
const withForm = (state: State, change: (form: Form) => Form): State => ({ ...state, form: change(state.form) })

/** The days the digits name on which a product added now may expire. */
const datesOf = (form: Form): ReadonlyArray<DateTime.Utc> =>
  Opt.match(form.maybeNow, {
    onNone: () => [],
    onSome: (now) => DigitDates.datesOf(form.digits, now).filter(Product.canExpireOn(now)),
  })

/** Whether the form offers to add the product with that expiration. */
const isOffered = (form: Form, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.match(maybeExpirationDate, {
    onNone: () => form.digits === '',
    onSome: (date) => datesOf(form).some((offered) => DateTime.Equivalence(offered, date)),
  })

/** The product the form describes with that expiration, created now, if it is one. */
const productOf = (form: Form, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.flatMap(
    Opt.all([form.maybeName, form.maybeNow]),
    ([name, creationDate]) => Product.make({ name, creationDate, maybeExpirationDate }),
  )

const startOf = (form: Form, maybeExpirationDate: Opt.Option<DateTime.Utc>) =>
  Opt.map(productOf(form, maybeExpirationDate), () => Message.Started({ maybeExpirationDate }))

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
        scans: 0,
        digits: '',
        isCameraOn: true,
        maybeNow: Opt.none(),
        maybeLastAdded: Opt.none(),
      },
    },
  },

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted while submitting too, though the input is disabled then: a key typed just before is kept for the
    // next product. The raw text is kept as typed; whether it is a valid name is decided when adding.
    NameChanged: ({ name }) => (state) => ({
      state: withForm(state, (form) => ({ ...form, maybeName: Opt.some(name) })),
    }),

    DigitTyped: ({ digit }) => (state) =>
      state._tag === 'Editing' && state.form.digits.length < DigitDates.MAX_DIGITS
        ? { state: withForm(state, (form) => ({ ...form, digits: form.digits + digit })) }
        : Tea.reject,

    DigitErased: () => (state) =>
      state._tag === 'Editing' && state.form.digits !== ''
        ? { state: withForm(state, (form) => ({ ...form, digits: form.digits.slice(0, -1) })) }
        : Tea.reject,

    TimeChanged: ({ now }) => (state) => ({ state: withForm(state, (form) => ({ ...form, maybeNow: Opt.some(now) })) }),

    // The camera keeps reading the product in front of it: only another code replaces the name, so a name
    // the user corrected stays until the next product.
    Scanned: ({ barcode }) => (state) =>
      Opt.contains(state.form.maybeName, barcode)
        ? { state }
        : { state: withForm(state, (form) => ({ ...form, maybeName: Opt.some(barcode), scans: form.scans + 1 })) },

    CameraFailed: () => (state) => ({ state: withForm(state, (form) => ({ ...form, isCameraOn: false })) }),

    Started: ({ maybeExpirationDate }) => (state) => {
      if (state._tag !== 'Editing' || !isOffered(state.form, maybeExpirationDate)) {
        return Tea.reject
      }
      return Opt.match(productOf(state.form, maybeExpirationDate), {
        onNone: () => Tea.reject,
        onSome: (product) => ({
          state: { _tag: 'Submitting', form: state.form, product },
          commands: [Command.Add({ product })],
        }),
      })
    },

    // The next product starts with no digits, and the name of this one: a second package of it may be next.
    Completed: ({ succeeded }) => (state) => {
      if (state._tag !== 'Submitting') {
        return defect('Completed while no product is being added: only a completion leaves Submitting')
      }
      return succeeded
        ? { state: { _tag: 'Editing', form: { ...state.form, digits: '', maybeLastAdded: Opt.some(state.product) } } }
        : {
          state: { _tag: 'Editing', form: state.form },
          commands: [Command.ShowToast({ text: 'Could not add the product' })],
        }
    },

    // Each press asks the parent to leave, which removes the page on the first one. The page is not left while a
    // product is being added.
    BackPressed: () => (state) => state._tag === 'Editing' ? { state, events: [Event.LeaveRequested()] } : { state },
  }),

  runCommand: Match.typeTags<Command>()({
    Add: add,
    ShowToast: showToast,
  }),

  // Once the camera has failed, it is not tried again until the page is opened anew.
  subscriptions: ({ form }) =>
    form.isCameraOn
      ? HashMap.make(['clock', clock], ['scanner', scanner], ['back-button', backButton])
      : HashMap.make(['clock', clock], ['back-button', backButton]),

  makeModel: (state) => {
    const { form } = state
    const isEditing = state._tag === 'Editing'
    const shown: Shown = {
      isCameraOn: form.isCameraOn,
      name: Opt.getOrElse(form.maybeName, () => ''),
      nameKey: form.scans,
      maybeDigits: Opt.liftPredicate(form.digits, (digits) => digits !== ''),
      maybeJustAdded: Opt.filter(form.maybeLastAdded, (product) => isJustAdded(product, form.maybeNow)),
      maybeTypeDigit: isEditing && form.digits.length < DigitDates.MAX_DIGITS
        ? Opt.some((digit: Digit) => Message.DigitTyped({ digit }))
        : Opt.none(),
      maybeEraseDigit: isEditing && form.digits !== '' ? Opt.some(Message.DigitErased()) : Opt.none(),
    }
    if (state._tag === 'Submitting') {
      return { _tag: 'Submitting', ...shown }
    }
    const choices = datesOf(form).map((date): DateChoice => ({ date, maybeAdd: startOf(form, Opt.some(date)) }))
    return {
      _tag: 'Editing',
      ...shown,
      close: Message.BackPressed(),
      changeName: (name: string) => Message.NameChanged({ name }),
      date: form.digits === ''
        ? { _tag: 'Undated', maybeAddUndated: startOf(form, Opt.none()) }
        : Arr.isReadonlyArrayNonEmpty(choices)
        ? { _tag: 'Naming', choices }
        : { _tag: 'NamingNothing' },
    }
  },
}
