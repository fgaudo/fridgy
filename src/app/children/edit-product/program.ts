// The page that edits a stored product: its name and its expiration date, typed on a keypad
// (`docs/edit-product.md`). The states are the wait for the date order and the clock (`Loading`), the form
// (`Editing`) and the write (`Saving`). Once the product is saved, the page asks to be left. A failure is told by
// a snackbar, which leaves on its own.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#domain/product.ts'
import { BackButton } from '#infrastructure/back-button/back-button.ts'
import { type Feedback, Haptics } from '#infrastructure/haptics/haptics.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { defect } from '#libs/defect/defect.ts'
import { DateOrderSetting } from './services/date-order-setting/date-order-setting.ts'
import { UpdateProduct } from './services/update-product/update-product.ts'

export type { Digit } from '#libs/dates/digit-date-entry.ts'

type Digit = DigitDateEntry.Digit

/** What the page starts from: the product as the row the user tapped shows it, and its id in the storage. */
export type Flags = Readonly<{ id: string; product: Product.Product }>

/** The expiration date, as stored until a key is pressed, then as typed. */
export type DateForm = Data.TaggedEnum<{
  /** The stored expiration, or none: shown as its digits in the order in use, rewritten when the order changes. */
  Kept: object
  Typed: Readonly<{ entry: DigitDateEntry.Entry }>
}>

/** What is kept while the product is edited and while it is saved: a save that fails gives the form back. */
export type Form = Readonly<{
  id: string
  /** The product as it was opened: what the fields started from, and what "changed" is measured against. */
  original: Product.Product
  /** The name as typed; whether it is a name is decided when saving. */
  name: string
  /** How many times the name's input was drawn anew: with each clearing. */
  replacements: number
  /** The current time: a date typed without a year is read from today. */
  now: DateTime.Utc
  /** The order the digits of a date are read in. */
  order: DateOrder.DateOrder
  date: DateForm
  snackbar: Snackbar
}>

/** Material shows one snackbar at a time: one that comes after another waits for it to leave. */
export type Entrance = 'Alone' | 'AfterAnother'

/** What failed: the snackbar says so. */
export type Failure = 'SaveFailed' | 'OrderNotKept'

/** The snackbar, until it has stood its time. `id` tells one from the next. */
export type Snackbar = Data.TaggedEnum<{
  None: object
  Shown: Readonly<{ id: number; failure: Failure; entrance: Entrance }>
}>

export type State = Data.TaggedEnum<{
  /**
   * Until the order the digits are read in and the time are known: the stored date cannot be drawn as digits
   * without the order, nor its day offered without today.
   */
  Loading: Readonly<{
    id: string
    original: Product.Product
    maybeNow: Opt.Option<DateTime.Utc>
    maybeOrder: Opt.Option<DateOrder.DateOrder>
  }>
  Editing: Readonly<{ form: Form }>
  /** The product is being saved: only its completion leaves this state. */
  Saving: Readonly<{ form: Form; product: Product.Product }>
}>

/** What the write answered: done, failed, or nothing is stored under the id any more, as of `at`. */
export type Outcome = Data.TaggedEnum<{
  Saved: object
  Failed: object
  Gone: Readonly<{ at: DateTime.Utc }>
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  NameChanged: { name: string }
  /** The name field's clear button: empties the name. */
  NameCleared: object
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** The keypad's clear key: erases every digit, which removes the expiration. */
  DateCleared: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: DateTime.Utc }
  /** The segmented button: the order the digits are read in, kept for every date to come. */
  OrderPicked: { order: DateOrder.DateOrder }
  /** Saves the product the fields describe. */
  SaveStarted: object
  /** The app bar's close button. */
  Closed: object
  // From subscriptions.
  TimeChanged: { now: DateTime.Utc }
  /** The order kept: the setting reports it when the page opens, and after every pick. */
  OrderChanged: { order: DateOrder.DateOrder }
  /** The platform's back button, while the page is shown. */
  BackPressed: object
  /** The snackbar has stood its time. */
  SnackbarExpired: object
  // From commands.
  OrderKept: { succeeded: boolean }
  Saved: { outcome: Outcome }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  /** Writes a product that `update` has already validated, under its id. */
  Save: { id: string; product: Product.Product }
  /** Keeps the order the digits of a date are read in, which the setting then reports. */
  KeepOrder: { order: DateOrder.DateOrder }
  Vibrate: { feedback: Feedback }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  LeaveRequested: object
  /**
   * Nothing was stored under the id any more, at `at`: the page asks to be left, and the page under it to say
   * so, since this one goes.
   */
  ProductGone: { at: DateTime.Utc }
}>

const Event = Data.taggedEnum<Event>()

export type Deps = UpdateProduct | DateOrderSetting | Haptics | BackButton

/** A day the digits name: the chosen one, or one to pick while the page takes input. */
export type DateChoice = Readonly<{
  date: DateTime.Utc
  choice: Data.TaggedEnum<{ Chosen: object; Offered: Readonly<{ maybeChoose: Opt.Option<Message> }> }>
}>

/** An order the digits can be read in: the one in use, or one to pick while the page takes input. */
export type OrderChoice = Readonly<{
  order: DateOrder.DateOrder
  choice: Data.TaggedEnum<{ Current: object; Offered: Readonly<{ maybePick: Opt.Option<Message> }> }>
}>

/** What is drawn in every state but `Loading`: the fields, and the snackbar over them. */
export type FieldsShown = Readonly<{
  name: string
  /** Changes when the name is cleared, not by typing. */
  nameKey: number
  order: DateOrder.DateOrder
  orders: Arr.NonEmptyReadonlyArray<OrderChoice>
  /** The date's field: the digits shown, the stored date's or the typed ones. */
  digits: string
  /** Under the field: that the product never expires, the days the digits name, or that they name none. */
  strip: Data.TaggedEnum<{
    Empty: object
    Naming: Readonly<{ choices: Arr.NonEmptyReadonlyArray<DateChoice> }>
    NamingNothing: object
  }>
  /** Over the fields. */
  snackbar: Snackbar
}>

export type Model = Data.TaggedEnum<{
  /** The app bar alone, until the fields can be drawn. */
  Loading: Readonly<{ close: Message }>
  Editing:
    & FieldsShown
    & Readonly<{
      close: Message
      changeName: (name: string) => Message
      /** Empties the name, while there is one. */
      maybeClearName: Opt.Option<Message>
      /** The keypad's keys: none past a date's longest. */
      maybeTypeDigit: Opt.Option<(digit: Digit) => Message>
      /** None with nothing to erase. */
      maybeEraseDigit: Opt.Option<Message>
      /** None with nothing to clear. */
      maybeClearDate: Opt.Option<Message>
      /** Saves, once the fields describe a product other than the stored one. */
      maybeSave: Opt.Option<Message>
    }>
  /** The product is being saved: the fields, their controls disabled. */
  Saving: FieldsShown
}>

// Material's snackbar without an action: long enough to read it.
const SNACKBAR_DURATION = Duration.seconds(4)

/** A snackbar telling of a failure, after the one standing, if any. */
const told = (failure: Failure) => (form: Form): Form => ({
  ...form,
  snackbar: form.snackbar._tag === 'Shown'
    ? { _tag: 'Shown', id: form.snackbar.id + 1, failure, entrance: 'AfterAnother' }
    : { _tag: 'Shown', id: 0, failure, entrance: 'Alone' },
})

/**
 * The entry the fields show: the stored date's digits in the order in use, none for a product that never expires,
 * or the one typed.
 */
const entryOf = (form: Form): DigitDateEntry.Entry =>
  form.date._tag === 'Typed'
    ? form.date.entry
    : {
      digits: Opt.match(form.original.maybeExpirationDate, {
        onNone: () => '',
        onSome: (date) => DigitDates.digitsOf(date, form.order),
      }),
      maybeChosenDate: Opt.none(),
    }

// A past day may be entered with its year: the user may be correcting a typo, or recording a product bought past
// its date. Only a day before the product was created is not one it may expire on.
const offeredDates = (form: Form): ReadonlyArray<DateTime.Utc> =>
  DigitDateEntry.offered(entryOf(form), form.now, form.order, Product.canExpireOn(form.original.creationDate))

/**
 * The expiration the fields name: the stored one while untouched, none on no digits, the day the digits name;
 * `None` when they name no day the product may expire on.
 */
const maybeNamedExpiration = (form: Form): Opt.Option<Opt.Option<DateTime.Utc>> =>
  form.date._tag === 'Kept'
    ? Opt.some(form.original.maybeExpirationDate)
    : form.date.entry.digits === ''
    ? Opt.some(Opt.none())
    : Opt.map(DigitDateEntry.named(form.date.entry, offeredDates(form)), Opt.some)

/** The product the fields describe, created when it was: `None` when it breaks a rule of a product. */
const productOf = (form: Form): Opt.Option<Product.Product> =>
  Opt.flatMap(
    maybeNamedExpiration(form),
    (maybeExpirationDate) =>
      Product.make({ name: form.name, creationDate: form.original.creationDate, maybeExpirationDate }),
  )

// An expiration names a day: the same day typed again is no change.
const isSameExpiration = Opt.makeEquivalence((a: DateTime.Utc, b: DateTime.Utc) =>
  DateTime.Equivalence(DateTime.startOf(a, 'day'), DateTime.startOf(b, 'day'))
)

// The made product, not the typed text: a name retyped with other spacing is no change.
const isChanged = (form: Form, product: Product.Product) =>
  product.name !== form.original.name
  || !isSameExpiration(product.maybeExpirationDate, form.original.maybeExpirationDate)

/** The product the fields describe, when it is one and differs from the stored one: what "Save" writes. */
const maybeSaved = (form: Form): Opt.Option<Product.Product> =>
  Opt.filter(productOf(form), (product) => isChanged(form, product))

/** The form, once the order and the time are known: the stored product in its fields. */
const editingOnceKnown = (loading: State & { _tag: 'Loading' }): State =>
  Opt.match(Opt.all([loading.maybeNow, loading.maybeOrder]), {
    onNone: () => loading,
    onSome: ([now, order]) => ({
      _tag: 'Editing',
      form: {
        id: loading.id,
        original: loading.original,
        name: loading.original.name,
        replacements: 0,
        now,
        order,
        date: { _tag: 'Kept' },
        snackbar: { _tag: 'None' },
      },
    }),
  })

const withForm = (state: State & { _tag: 'Editing' | 'Saving' }, change: (form: Form) => Form): State => ({
  ...state,
  form: change(state.form),
})

/** The form with its date changed by a key of the keypad, or rejected when the key does not apply. */
const keyed = (
  state: State,
  key: (entry: DigitDateEntry.Entry, form: Form) => Opt.Option<DigitDateEntry.Entry>,
): Tea.Transition<State, Command, Event> =>
  state._tag === 'Editing'
    ? Opt.match(key(entryOf(state.form), state.form), {
      onNone: () => Tea.reject,
      onSome: (entry) => ({ state: withForm(state, (form) => ({ ...form, date: { _tag: 'Typed', entry } })) }),
    })
    : Tea.reject

// Only today is needed, for a date typed without a year: the product's own dates never come from the clock.
const clock = Channel.forever(
  Channel.fromEffect(DateTime.now).pipe(
    Channel.map((now) => Message.TimeChanged({ now })),
    Channel.concatWith(() => Channel.fromEffectDrain(Effect.sleep('30 seconds'))),
  ),
)

const dateOrder: Tea.Subscription<Message, DateOrderSetting> = Channel.unwrap(
  Effect.map(
    Effect.service(DateOrderSetting),
    ({ changes }) => Channel.map(changes, (order) => Message.OrderChanged({ order })),
  ),
)

// Observed as long as the page is shown: while the product is being saved, the press is heard and held, so that
// the platform does not leave the app.
const backButton: Tea.Subscription<Message, BackButton> = Channel.unwrap(
  Effect.map(Effect.service(BackButton), ({ presses }) => Channel.map(presses, () => Message.BackPressed())),
)

const always: HashMap.HashMap<string, Tea.Subscription<Message, Deps>> = HashMap.make(
  ['clock', clock],
  ['date-order', dateOrder],
  ['back-button', backButton],
)

/** Ends once the snackbar has stood its time. */
const snackbarTimer: Tea.Subscription<Message, Deps> = Channel.fromEffectDone(
  Effect.as(Effect.sleep(SNACKBAR_DURATION), Message.SnackbarExpired()),
)

const save = Effect.fn('SaveProduct')(
  function*({ id, product }: Readonly<{ id: string; product: Product.Product }>) {
    const { update } = yield* UpdateProduct
    yield* Effect.logDebug('Saving a product', { id })
    yield* update(id, Product.toSnapshot(product)).pipe(
      Effect.tapError((error) => Effect.logWarning('Could not save the product', error)),
    )
    yield* Effect.logInfo('Saved a product', { id })
    return Message.Saved({ outcome: { _tag: 'Saved' } })
  },
  Effect.catch((error) =>
    error._tag === 'ProductNotStored'
      ? Effect.map(DateTime.now, (at) => Message.Saved({ outcome: { _tag: 'Gone', at } }))
      : Effect.succeed(Message.Saved({ outcome: { _tag: 'Failed' } }))
  ),
  Effect.asSome,
  Effect.withLogSpan('SaveProduct'),
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

const fieldsOf = (form: Form, takesInput: boolean): FieldsShown => {
  const entry = entryOf(form)
  const offered = offeredDates(form)
  const maybeNamed = DigitDateEntry.named(entry, offered)
  const choices = offered.map((day): DateChoice => ({
    date: day,
    choice: Opt.contains(maybeNamed, day)
      ? { _tag: 'Chosen' }
      : {
        _tag: 'Offered',
        maybeChoose: takesInput
          ? Opt.map(DigitDateEntry.choose(day, offered)(entry), () => Message.DateChosen({ date: day }))
          : Opt.none(),
      },
  }))
  return {
    name: form.name,
    nameKey: form.replacements,
    order: form.order,
    orders: Arr.map(DateOrder.all, (order): OrderChoice => ({
      order,
      choice: order === form.order
        ? { _tag: 'Current' }
        : { _tag: 'Offered', maybePick: takesInput ? Opt.some(Message.OrderPicked({ order })) : Opt.none() },
    })),
    digits: entry.digits,
    strip: entry.digits === ''
      ? { _tag: 'Empty' }
      : Arr.isReadonlyArrayNonEmpty(choices)
      ? { _tag: 'Naming', choices }
      : { _tag: 'NamingNothing' },
    snackbar: form.snackbar,
  }
}

export const program: Tea.Program<{
  state: State
  model: Model
  message: Message
  command: Command
  services: Deps
  event: Event
  flags: Flags
}> = {
  init: ({ id, product }) => ({
    state: { _tag: 'Loading', id, original: product, maybeNow: Opt.none(), maybeOrder: Opt.none() },
  }),

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // Accepted while saving too, the input disabled: a key typed just before is kept. Whether it is a name is
    // decided when saving.
    NameChanged: ({ name }) => (state) =>
      state._tag === 'Loading' ? Tea.reject : { state: withForm(state, (form) => ({ ...form, name })) },

    // The input is drawn anew, empty: the user owns its text until the program replaces it.
    NameCleared: () => (state) =>
      state._tag === 'Editing' && state.form.name !== ''
        ? { state: withForm(state, (form) => ({ ...form, name: '', replacements: form.replacements + 1 })) }
        : Tea.reject,

    // On the untouched stored date, a digit is rejected: eight are a date's longest.
    DigitTyped: ({ digit }) => (state) => keyed(state, DigitDateEntry.typeDigit(digit)),

    DigitErased: () => (state) => keyed(state, DigitDateEntry.eraseDigit),

    DateCleared: () => (state) => keyed(state, DigitDateEntry.clear),

    DateChosen: ({ date }) => (state) =>
      keyed(state, (entry, form) => DigitDateEntry.choose(date, offeredDates(form))(entry)),

    // Only another order than the one in use: a tap on the selected segment does nothing. The untouched stored
    // date is then shown in the new order; typed digits stay as typed, read in it.
    OrderPicked: ({ order }) => (state) =>
      state._tag === 'Editing' && state.form.order !== order
        ? { state: withForm(state, (form) => ({ ...form, order })), commands: [Command.KeepOrder({ order })] }
        : Tea.reject,

    SaveStarted: () => (state) =>
      state._tag === 'Editing'
        ? Opt.match(maybeSaved(state.form), {
          onNone: () => Tea.reject,
          onSome: (product) => ({
            state: { _tag: 'Saving', form: state.form, product },
            commands: [Command.Save({ id: state.form.id, product })],
          }),
        })
        : Tea.reject,

    // Each press asks the parent to leave, which removes the page on the first one. The changes are discarded.
    Closed: () => (state) => state._tag === 'Saving' ? Tea.reject : { state, events: [Event.LeaveRequested()] },

    TimeChanged: ({ now }) => (state) =>
      state._tag === 'Loading'
        ? { state: editingOnceKnown({ ...state, maybeNow: Opt.some(now) }) }
        : { state: withForm(state, (form) => ({ ...form, now })) },

    OrderChanged: ({ order }) => (state) =>
      state._tag === 'Loading'
        ? { state: editingOnceKnown({ ...state, maybeOrder: Opt.some(order) }) }
        : { state: withForm(state, (form) => ({ ...form, order })) },

    // The page is not left in the middle of a write: the press is held, so that the platform does not leave the app.
    BackPressed: () => (state) => state._tag === 'Saving' ? { state } : { state, events: [Event.LeaveRequested()] },

    SnackbarExpired: () => (state) =>
      state._tag !== 'Loading' && state.form.snackbar._tag === 'Shown'
        ? { state: withForm(state, (form) => ({ ...form, snackbar: { _tag: 'None' } })) }
        : defect('SnackbarExpired while no snackbar is shown: the timer runs only while one is'),

    // The order picked stays in use for this visit either way: only the failure to keep it is told.
    OrderKept: ({ succeeded }) => (state) =>
      state._tag === 'Loading'
        ? defect('OrderKept while loading: an order is picked only once the form is there, which never goes')
        : succeeded
        ? { state }
        : { state: withForm(state, told('OrderNotKept')), commands: [Command.Vibrate({ feedback: 'Reject' })] },

    // Once saved, or once there is nothing to save to, the page asks to be left: Home's list shows the change, and
    // Home says that the product is gone, as this page goes.
    Saved: ({ outcome }) => (state) => {
      if (state._tag !== 'Saving') {
        return defect('Saved while no product is being saved: only a completion leaves Saving')
      }
      const editing: State & { _tag: 'Editing' } = { _tag: 'Editing', form: state.form }
      return Match.valueTags(outcome, {
        Saved: (): Tea.Transition<State, Command, Event> => ({
          state: editing,
          commands: [Command.Vibrate({ feedback: 'Confirm' })],
          events: [Event.LeaveRequested()],
        }),
        Failed: (): Tea.Transition<State, Command, Event> => ({
          state: withForm(editing, told('SaveFailed')),
          commands: [Command.Vibrate({ feedback: 'Reject' })],
        }),
        Gone: ({ at }): Tea.Transition<State, Command, Event> => ({
          state: editing,
          commands: [Command.Vibrate({ feedback: 'Reject' })],
          events: [Event.ProductGone({ at })],
        }),
      })
    },
  }),

  runCommand: Match.typeTags<Command>()({
    Save: save,
    KeepOrder: keepOrder,
    Vibrate: vibrate,
  }),

  // The back button is observed in every state: while saving, so that a press is held. The snackbar's timer is
  // keyed by its id: the next one starts it anew.
  subscriptions: (state) =>
    state._tag !== 'Loading' && state.form.snackbar._tag === 'Shown'
      ? HashMap.set(always, `snackbar:${state.form.snackbar.id}`, snackbarTimer)
      : always,

  makeModel: (state): Model =>
    Match.valueTags(state, {
      Loading: (): Model => ({ _tag: 'Loading', close: Message.Closed() }),
      // A key is there exactly where its rule applies to the entry shown: every digit applies, or none does.
      Editing: ({ form }): Model => {
        const entry = entryOf(form)
        return {
          _tag: 'Editing',
          ...fieldsOf(form, true),
          close: Message.Closed(),
          changeName: (name: string) => Message.NameChanged({ name }),
          maybeClearName: form.name !== '' ? Opt.some(Message.NameCleared()) : Opt.none(),
          maybeTypeDigit: Opt.map(
            DigitDateEntry.typeDigit('0')(entry),
            () => (digit: Digit) => Message.DigitTyped({ digit }),
          ),
          maybeEraseDigit: Opt.map(DigitDateEntry.eraseDigit(entry), () => Message.DigitErased()),
          maybeClearDate: Opt.map(DigitDateEntry.clear(entry), () => Message.DateCleared()),
          maybeSave: Opt.map(maybeSaved(form), () => Message.SaveStarted()),
        }
      },
      Saving: ({ form }): Model => ({ _tag: 'Saving', ...fieldsOf(form, false) }),
    }),
}
