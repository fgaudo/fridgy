import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import type { DateOrder } from '#libs/dates/date-order.ts'
import { arbitrary as day } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import { digit, digits } from '#libs/dates/digit-date-entry.test_arbitrary.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { zone, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { type DateForm, type External, type Message, program, type State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export { digit }

/**
 * The stored product, or none, and the time. For a stored one, today is often after its creation, as it is on a
 * phone, and at times before it, as a clock set back.
 */
const opened: fc.Arbitrary<Readonly<{ maybeStored: Opt.Option<Product.Product>; now: DateTime.Zoned }>> = fc.oneof(
  zoned.map((now) => ({ maybeStored: Opt.none(), now })),
  fc.tuple(product, fc.integer({ min: -10, max: 1_000 }), zone, zoned, fc.boolean()).map((
    [stored, days, zone, other, isAfter],
  ) => ({
    maybeStored: Opt.some(stored),
    now: isAfter ? DateTime.setZone(DateTime.add(stored.creationDate, { days }), zone) : other,
  })),
)

/** The days a product may expire on, as the program reads them. */
const isAllowed = (maybeStored: Opt.Option<Product.Product>, now: DateTime.Zoned) =>
  Opt.match(maybeStored, {
    onNone: () => Product.canExpireOn(now),
    onSome: (stored) => Product.canBeEditedToExpireOn(stored, now.zone),
  })

/**
 * Digits as typed: any, those of a day around today or around the stored product's creation, whole or only its
 * first four, and those of the stored date, in the order in use or another.
 */
const typedDigits = (maybeStored: Opt.Option<Product.Product>, now: DateTime.Zoned) => {
  const around = (from: DateTime.DateTime) =>
    fc.tuple(fc.integer({ min: -400, max: 400 }), order, fc.boolean()).map(([days, order, isShort]) => {
      const all = DigitDates.digitsOf(Day.fromDateTime(DateTime.setZone(DateTime.add(from, { days }), now.zone)), order)
      return isShort ? all.slice(0, 4) : all
    })
  return Opt.match(maybeStored, {
    onNone: () => fc.oneof(digits, around(now)),
    onSome: (stored) =>
      fc.oneof(
        digits,
        around(now),
        around(stored.creationDate),
        order.map((order) =>
          Opt.match(stored.maybeExpirationDate, {
            onNone: () => '',
            onSome: (date) => DigitDates.digitsOf(date, order),
          })
        ),
      ),
  })
}

// The day picked is often one the digits name, and sometimes one they no longer do, as after the time or the
// order changed, or none.
const typed = (
  maybeStored: Opt.Option<Product.Product>,
  now: DateTime.Zoned,
  order: DateOrder,
): fc.Arbitrary<DateForm> =>
  fc.tuple(typedDigits(maybeStored, now), fc.constantFrom('offered', 'other', 'none'), fc.nat(), day).map((
    [digits, picked, index, other],
  ): DateForm => {
    const offered = DigitDateEntry.offered(
      { ...DigitDateEntry.empty, digits },
      Day.fromDateTime(now),
      order,
      isAllowed(maybeStored, now),
    )
    const maybeChosenDate = picked === 'offered' && offered.length > 0
      ? Opt.fromNullishOr(offered[index % offered.length])
      : picked === 'other'
      ? Opt.some(other)
      : Opt.none()
    return { _tag: 'Typed', entry: { digits, maybeChosenDate } }
  })

/**
 * Any state the date can be in. A key is taken only once the order is known, and the order, once known, stays
 * known: digits are typed only with an order.
 */
export const state: fc.Arbitrary<State> = fc.tuple(opened, fc.nat({ max: 3 }), fc.boolean(), maybe(order)).chain((
  [{ maybeStored, now }, told, isLocked, maybeOrder],
) => {
  // Most often, the page has told the time.
  const page = { maybeNow: told === 0 ? Opt.none() : Opt.some(now), isLocked }
  const kept = fc.constant<DateForm>({ _tag: 'Kept' })
  const date = Opt.match(maybeOrder, {
    onNone: () => kept,
    onSome: (order) => fc.oneof(kept, typed(maybeStored, now, order)),
  })
  return date.map((date): State => ({ maybeStored, page, maybeOrder, date }))
})

/** A state whose date concludes on a day. */
export const concludingOn = state.filter((s) => program.output(s)._tag === 'On')

/** A state whose date concludes nothing yet. */
export const undecided = state.filter((s) => program.output(s)._tag === 'Undecided')

/** A state whose date says the product never expires. */
export const concludingNever = state.filter((s) => program.output(s)._tag === 'Never')

/** What a page tells: at times the time, and whether its form is locked. */
export const external: fc.Arbitrary<External> = fc.record({ maybeNow: maybe(zoned), isLocked: fc.boolean() }).map((
  page,
): External => ({ _tag: 'PageChanged', ...page }))

export const message: fc.Arbitrary<Message> = fc.oneof(
  digit.map((digit) => Msg.DigitTyped({ digit })),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.DateCleared()),
  day.map((date) => Msg.DateChosen({ date })),
  order.map((order) => Msg.OrderPicked({ order })),
  order.map((order) => Msg.OrderChanged({ order })),
  fc.boolean().map((succeeded) => Msg.OrderKept({ succeeded })),
)
