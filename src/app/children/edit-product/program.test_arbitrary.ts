import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import { arbitrary as day } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import { digit, digits } from '#libs/dates/digit-date-entry.test_arbitrary.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { zone, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import type { DateForm, Failure, Form, Message, Outcome, Snackbar, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export { digit }

const id = fc.nat().map(String)

// Today is often after the product's creation, as it is on a phone, and at times before it, as a clock set back.
const opened = fc.tuple(product, fc.integer({ min: -10, max: 1_000 }), zone, zoned, fc.boolean()).map((
  [original, days, zone, other, isAfter],
) => ({ original, now: isAfter ? DateTime.setZone(DateTime.add(original.creationDate, { days }), zone) : other }))

/**
 * Digits as typed, at times those of a day before the creation day, of a day after it, or of the stored date, in
 * the order in use or another.
 */
const typedDigits = (original: Product.Product, now: DateTime.Zoned) =>
  fc.oneof(
    digits,
    fc.tuple(fc.integer({ min: -400, max: 400 }), order).map(([days, order]) =>
      DigitDates.digitsOf(
        Day.fromDateTime(DateTime.setZone(DateTime.add(original.creationDate, { days }), now.zone)),
        order,
      )
    ),
    fc.tuple(fc.integer({ min: 0, max: 400 }), order).map(([days, order]) =>
      DigitDates.digitsOf(Day.fromDateTime(DateTime.add(now, { days })), order).slice(0, 4)
    ),
    order.map((order) =>
      Opt.match(original.maybeExpirationDate, {
        onNone: () => '',
        onSome: (date) => DigitDates.digitsOf(date, order),
      })
    ),
  )

// The day picked is often one the digits name, and sometimes one they no longer do, or none.
const dateForm = (form: Omit<Form, 'date'>): fc.Arbitrary<DateForm> =>
  fc.oneof(
    fc.constant<DateForm>({ _tag: 'Kept' }),
    fc.tuple(typedDigits(form.original, form.now), fc.constantFrom('offered', 'other', 'none'), fc.nat(), day).map((
      [digits, picked, index, other],
    ): DateForm => {
      const offered = DigitDateEntry.offered(
        { ...DigitDateEntry.empty, digits },
        Day.fromDateTime(form.now),
        form.order,
        Product.canBeEditedToExpireOn(form.original, form.now.zone),
      )
      const maybeChosenDate = picked === 'offered' && offered.length > 0
        ? Opt.fromNullishOr(offered[index % offered.length])
        : picked === 'other'
        ? Opt.some(other)
        : Opt.none()
      return { _tag: 'Typed', entry: { digits, maybeChosenDate } }
    }),
  )

const snackbarOf = (...failures: ReadonlyArray<Failure>): fc.Arbitrary<Snackbar> =>
  fc.oneof(
    fc.constant({ _tag: 'None' } as const),
    fc.record({
      id: fc.nat({ max: 5 }),
      failure: fc.constantFrom(...failures),
      entrance: fc.constantFrom('Alone', 'AfterAnother'),
    }).map((fields) => ({ _tag: 'Shown', ...fields } as const)),
  )

// A product gone is told only once the page has stopped taking input.
export const snackbar = snackbarOf('SaveFailed', 'OrderNotKept')

// The name is often the stored one, at times with other spacing, and at times anything typed.

/** How far the keyboard covers the page: down most often, otherwise as tall as a keyboard. */
export const keyboardInset = fc.oneof({ arbitrary: fc.constant(0), weight: 3 }, fc.integer({ min: 120, max: 400 }))

export const form: fc.Arbitrary<Form> = fc
  .tuple(opened, id, fc.nat(), order, fc.string(), fc.nat({ max: 3 }), snackbar, keyboardInset)
  .chain((
    [{ original, now }, id, replacements, order, typed, kind, snackbar, keyboardInset],
  ) => {
    const name = kind === 0 ? original.name : kind === 1 ? ` ${original.name}  ` : kind === 2 ? '' : typed
    const rest = { id, original, name, replacements, now, order, snackbar, keyboardInset }
    return dateForm(rest).map((date): Form => ({ ...rest, date }))
  })

// Never both known: the form is made as soon as they are.
export const loading = fc.tuple(id, opened, maybe(order), fc.boolean(), keyboardInset).map((
  [id, { original, now }, maybeOrder, hasNow, keyboardInset],
) => ({
  _tag: 'Loading',
  id,
  original,
  maybeNow: Opt.isSome(maybeOrder) || !hasNow ? Opt.none() : Opt.some(now),
  maybeOrder,
  keyboardInset,
} as const))

export const editing = form.map((form) => ({ _tag: 'Editing', form } as const))

export const saving = fc.tuple(form, product).map(([form, product]) => ({ _tag: 'Saving', form, product } as const))

// Its snackbar says so until it has stood its time, which leaves the page.
export const gone = fc.tuple(form, snackbarOf('ProductGone')).map(([form, snackbar]) => (
  { _tag: 'Gone', form: { ...form, snackbar } } as const
))

export const state: fc.Arbitrary<State> = fc.oneof(loading, editing, saving, gone)

export const outcome: fc.Arbitrary<Outcome> = fc.oneof(
  fc.constant({ _tag: 'Saved' } as const),
  fc.constant({ _tag: 'Failed' } as const),
  fc.constant({ _tag: 'Gone' } as const),
)

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.string().map((name) => Msg.NameChanged({ name })),
  fc.constant(Msg.NameCleared()),
  digit.map((digit) => Msg.DigitTyped({ digit })),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.DateCleared()),
  day.map((date) => Msg.DateChosen({ date })),
  order.map((order) => Msg.OrderPicked({ order })),
  fc.constant(Msg.SaveStarted()),
  fc.constant(Msg.Closed()),
  zoned.map((now) => Msg.TimeChanged({ now })),
  order.map((order) => Msg.OrderChanged({ order })),
  fc.constant(Msg.BackPressed()),
  fc.constant(Msg.SnackbarExpired()),
  fc.boolean().map((succeeded) => Msg.OrderKept({ succeeded })),
  outcome.map((outcome) => Msg.Saved({ outcome })),
)
