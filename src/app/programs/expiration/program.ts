// The expiration date of a product, typed as digits on a keypad and read in the order the user writes dates in
// (`docs/edit-product.md`): of a product to be, or of a stored one, whose date is kept until a key is pressed. Its
// page tells it the time and whether it takes input, and reads the day it concludes as the output.
import * as Tea from '@fgaudo/effect-tea'
import * as Arr from 'effect/Array'
import * as Channel from 'effect/Channel'
import * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Opt from 'effect/Option'
import * as Product from '#domain/product.ts'
import * as DateOrder from '#libs/dates/date-order.ts'
import * as Day from '#libs/dates/day.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { DateOrderSetting } from './services/date-order-setting/date-order-setting.ts'

export type { Digit } from '#libs/dates/digit-date-entry.ts'

type Digit = DigitDateEntry.Digit

/** The stored product whose expiration is edited: none for a product to be. */
export type Flags = Readonly<{ maybeStored: Opt.Option<Product.Product> }>

/**
 * What the page tells: the time, in the device's zone, once its clock has ticked, and whether its form is locked,
 * as while it is submitted.
 */
export type External = Readonly<{
  _tag: 'PageChanged'
  maybeNow: Opt.Option<DateTime.Zoned>
  isLocked: boolean
}>

/** The date, as stored until a key is pressed, then as typed. */
export type DateForm = Data.TaggedEnum<{
  /** The stored expiration, or none: shown as its digits in the order in use, rewritten when the order changes. */
  Kept: object
  Typed: Readonly<{ entry: DigitDateEntry.Entry }>
}>

export type State = Readonly<{
  maybeStored: Opt.Option<Product.Product>
  /** What the page told last: no time and a locked form, until it tells. */
  page: Readonly<{ maybeNow: Opt.Option<DateTime.Zoned>; isLocked: boolean }>
  /** The order the digits of a date are read in, once the setting has been read. */
  maybeOrder: Opt.Option<DateOrder.DateOrder>
  date: DateForm
}>

export type Message = Data.TaggedEnum<{
  // From the view.
  DigitTyped: { digit: Digit }
  DigitErased: object
  /** The keypad's clear key: erases every digit. */
  DateCleared: object
  /** Picks, among the days the digits name, the one the product expires on. */
  DateChosen: { date: Day.Day }
  /** The segmented button: the order the digits are read in, kept for every date to come. */
  OrderPicked: { order: DateOrder.DateOrder }
  // From subscriptions.
  /** The order kept: the setting reports it as the date is first shown, and after every pick. */
  OrderChanged: { order: DateOrder.DateOrder }
  // From commands.
  OrderKept: { succeeded: boolean }
}>

const Message = Data.taggedEnum<Message>()

export type Command = Data.TaggedEnum<{
  /** Keeps the order the digits of a date are read in, which the setting then reports. */
  KeepOrder: { order: DateOrder.DateOrder }
}>

const Command = Data.taggedEnum<Command>()

export type Event = Data.TaggedEnum<{
  /** The order picked could not be kept: it stays in use for this date, and the page says so. */
  OrderNotKept: object
}>

const Event = Data.taggedEnum<Event>()

/** What the date concludes, for the page to make a product of. */
export type Output = Data.TaggedEnum<{
  /** The digits name no day yet, or the order they are read in is not known. */
  Undecided: object
  /** No digits: the product never expires. */
  Never: object
  On: Readonly<{ day: Day.Day }>
}>

const Output = Data.taggedEnum<Output>()

export type Key = 'date-order'

/** A day the digits name: the chosen one, or one to pick while the date takes input. */
export type DateChoice = Readonly<{
  date: Day.Day
  choice: Data.TaggedEnum<{ Chosen: object; Offered: Readonly<{ maybeChoose: Opt.Option<Message> }> }>
}>

/** An order the digits can be read in: the one in use, or one to pick while the date takes input. */
export type OrderChoice = Readonly<{
  order: DateOrder.DateOrder
  choice: Data.TaggedEnum<{ Current: object; Offered: Readonly<{ maybePick: Opt.Option<Message> }> }>
}>

/** The keypad's keys, each there exactly where its rule applies. */
export type Keys = Readonly<{
  /** By digit: none past a date's longest. */
  maybeTypeDigit: Opt.Option<Readonly<Record<Digit, Message>>>
  /** None with nothing to erase. */
  maybeEraseDigit: Opt.Option<Message>
  /** None with nothing to clear. */
  maybeClearDate: Opt.Option<Message>
}>

export type Model = Readonly<{
  /** `Unknown` until the setting has been read, a moment after the date is first shown. */
  order: Data.TaggedEnum<{
    Unknown: object
    Known: Readonly<{ order: DateOrder.DateOrder; choices: Arr.NonEmptyReadonlyArray<OrderChoice> }>
  }>
  /** The date's field: the stored date's digits, or the typed ones. */
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
  /** None while the page's form is locked: the date's controls are drawn disabled. */
  maybeKeys: Opt.Option<Keys>
}>

/**
 * The entry the field shows: the typed one, or the stored date's digits in the order in use. No digits for a
 * product that never expires, and until the order is known.
 */
const entryOf = (state: State): DigitDateEntry.Entry =>
  state.date._tag === 'Typed' ? state.date.entry : {
    digits: Opt.match(
      Opt.all([Opt.flatMap(state.maybeStored, (stored) => stored.maybeExpirationDate), state.maybeOrder]),
      { onNone: () => '', onSome: ([date, order]) => DigitDates.digitsOf(date, order) },
    ),
    maybeChosenDate: Opt.none(),
  }

/**
 * The days a product may expire on: one made now, not before today; a stored one, as the domain lets it be edited.
 * A past day may then be entered with its year: the user may be correcting a typo.
 */
const isAllowed = (state: State, now: DateTime.Zoned): (date: Day.Day) => boolean =>
  Opt.match(state.maybeStored, {
    onNone: () => Product.canExpireOn(now),
    onSome: (stored) => Product.canBeEditedToExpireOn(stored, now.zone),
  })

/** What reading the digits needs: none until the page has told the time and the setting the order. */
const maybeReading = (state: State) => Opt.all({ now: state.page.maybeNow, order: state.maybeOrder })

/** The days the digits name, read in the order in use, on which the product may expire. */
const offeredDates = (state: State): ReadonlyArray<Day.Day> =>
  Opt.match(maybeReading(state), {
    onNone: () => [],
    onSome: ({ now, order }) =>
      DigitDateEntry.offered(entryOf(state), Day.fromDateTime(now), order, isAllowed(state, now)),
  })

/** Whether the digits, or more typed after them, name a day the product may expire on. */
const canCompleteDate = (state: State): boolean =>
  Opt.match(maybeReading(state), {
    onNone: () => false,
    onSome: ({ now, order }) =>
      DigitDateEntry.canComplete(entryOf(state), Day.fromDateTime(now), order, isAllowed(state, now)),
  })

/** The day the typed digits name: the one picked, while they still name it, or else the only one they name. */
const maybeNamedDate = (state: State): Opt.Option<Day.Day> => DigitDateEntry.named(entryOf(state), offeredDates(state))

/**
 * Whether the keypad takes a key: while the page's form is not locked, once the order is known. The stored date
 * cannot be shown as digits before, nor a key applied to them.
 */
const takesInput = (state: State) => !state.page.isLocked && Opt.isSome(state.maybeOrder)

/** The date changed by a key of the keypad, or rejected when the key does not apply. */
const keyed = (
  state: State,
  key: (entry: DigitDateEntry.Entry) => Opt.Option<DigitDateEntry.Entry>,
): Tea.Transition<State, Command, Event> =>
  takesInput(state)
    ? Opt.match(key(entryOf(state)), {
      onNone: () => Tea.reject,
      onSome: (entry) => ({ state: { ...state, date: { _tag: 'Typed', entry } } }),
    })
    : Tea.reject

const dateOrder: Tea.Subscription<Message, DateOrderSetting> = Channel.unwrap(
  Effect.map(
    Effect.service(DateOrderSetting),
    ({ changes }) => Channel.map(changes, (order) => Message.OrderChanged({ order })),
  ),
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

const typed = (digit: Digit) => Message.DigitTyped({ digit })

/** The keypad's keys, by digit. */
const digitKeys: Readonly<Record<Digit, Message>> = {
  '0': typed('0'),
  '1': typed('1'),
  '2': typed('2'),
  '3': typed('3'),
  '4': typed('4'),
  '5': typed('5'),
  '6': typed('6'),
  '7': typed('7'),
  '8': typed('8'),
  '9': typed('9'),
}

const { make } = Tea.program<{
  state: State
  model: Model
  message: Message
  command: Command
  event: Event
  external: External
  flags: Flags
  output: Output
  key: Key
}>()

export const program = make({
  init: ({ maybeStored }) => ({
    state: {
      maybeStored,
      page: { maybeNow: Opt.none(), isLocked: true },
      maybeOrder: Opt.none(),
      date: { _tag: 'Kept' },
    },
  }),

  // Told only what is new: the library tells again where the page's state gives another value.
  external: ({ maybeNow, isLocked }) => (state) => ({ state: { ...state, page: { maybeNow, isLocked } } }),

  update: Match.typeTags<Message, (state: State) => Tea.Transition<State, Command, Event>>()({
    // On the untouched stored date, a digit is rejected: eight are a date's longest.
    DigitTyped: ({ digit }) => (state) => keyed(state, DigitDateEntry.typeDigit(digit)),

    DigitErased: () => (state) => keyed(state, DigitDateEntry.eraseDigit),

    DateCleared: () => (state) => keyed(state, DigitDateEntry.clear),

    DateChosen: ({ date }) => (state) => keyed(state, DigitDateEntry.choose(date, offeredDates(state))),

    // Only another order than the one in use: a tap on the selected segment does nothing. The order applies at
    // once, and is kept for the dates to come: the setting then reports it back, unchanged. The untouched stored
    // date is shown in the new order; typed digits stay as typed, read in it.
    OrderPicked: ({ order }) => (state) =>
      takesInput(state) && !Opt.contains(state.maybeOrder, order)
        ? { state: { ...state, maybeOrder: Opt.some(order) }, commands: [Command.KeepOrder({ order })] }
        : Tea.reject,

    // The day picked stays, while the digits still name it in the new order.
    OrderChanged: ({ order }) => (state) => ({
      state: Opt.contains(state.maybeOrder, order) ? state : { ...state, maybeOrder: Opt.some(order) },
    }),

    // The order picked stays in use either way: only the failure to keep it is told.
    OrderKept: ({ succeeded }) => (state) => succeeded ? { state } : { state, events: [Event.OrderNotKept()] },
  }),

  runCommand: Match.typeTags<Command>()({ KeepOrder: keepOrder }),

  subscriptions: () => ['date-order'],

  listen: () => dateOrder,

  // The stored date stands until a key is pressed, whatever the order: it is not read from its digits.
  output: (state) =>
    state.date._tag === 'Kept'
      ? Opt.match(Opt.flatMap(state.maybeStored, (stored) => stored.maybeExpirationDate), {
        onNone: () => Output.Never(),
        onSome: (day) => Output.On({ day }),
      })
      : state.date.entry.digits === ''
      ? Output.Never()
      : Opt.match(maybeNamedDate(state), {
        onNone: () => Output.Undecided(),
        onSome: (day) => Output.On({ day }),
      }),

  makeModel: (state) => {
    const entry = entryOf(state)
    const offered = offeredDates(state)
    const maybeNamed = DigitDateEntry.named(entry, offered)
    const isTaking = takesInput(state)
    const held = <A>(maybeKeyed: Opt.Option<A>) => isTaking ? maybeKeyed : Opt.none()
    const choices = offered.map((day): DateChoice => ({
      date: day,
      choice: Opt.contains(maybeNamed, day)
        ? { _tag: 'Chosen' }
        : { _tag: 'Offered', maybeChoose: isTaking ? Opt.some(Message.DateChosen({ date: day })) : Opt.none() },
    }))
    return {
      order: Opt.match(state.maybeOrder, {
        onNone: (): Model['order'] => ({ _tag: 'Unknown' }),
        onSome: (current): Model['order'] => ({
          _tag: 'Known',
          order: current,
          choices: Arr.map(DateOrder.all, (order): OrderChoice => ({
            order,
            choice: order === current
              ? { _tag: 'Current' }
              : { _tag: 'Offered', maybePick: isTaking ? Opt.some(Message.OrderPicked({ order })) : Opt.none() },
          })),
        }),
      }),
      digits: entry.digits,
      strip: Arr.isReadonlyArrayNonEmpty(choices)
        ? { _tag: 'Naming', choices }
        : entry.digits === '' || canCompleteDate(state)
        ? { _tag: 'Hint' }
        : { _tag: 'NamingNothing' },
      // A key is there exactly where its rule applies: every digit applies, or none does.
      // No key takes until the order is known, a moment after the date is first shown.
      maybeKeys: state.page.isLocked ? Opt.none() : Opt.some({
        maybeTypeDigit: Opt.map(held(DigitDateEntry.typeDigit('0')(entry)), () => digitKeys),
        maybeEraseDigit: Opt.map(held(DigitDateEntry.eraseDigit(entry)), () => Message.DigitErased()),
        maybeClearDate: Opt.map(held(DigitDateEntry.clear(entry)), () => Message.DateCleared()),
      }),
    }
  },
})
