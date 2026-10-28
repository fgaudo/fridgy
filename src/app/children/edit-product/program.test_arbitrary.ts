import * as Data from 'effect/Data'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as product } from '#domain/product.test_arbitrary.ts'
import * as Product from '#domain/product.ts'
import { arbitrary as order } from '#libs/dates/date-order.test_arbitrary.ts'
import { digit, digits } from '#libs/dates/digit-date-entry.test_arbitrary.ts'
import * as DigitDateEntry from '#libs/dates/digit-date-entry.ts'
import * as DigitDates from '#libs/dates/digit-dates.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { DateForm, Form, Message, Outcome, State } from './program.ts'

const Msg = Data.taggedEnum<Message>()

export { digit }

const id = fc.nat().map(String)

// Today is often after the product's creation, as it is on a phone, and at times before it, as a clock set back.
const opened = fc.tuple(product, fc.integer({ min: -10, max: 1_000 }), utc, fc.boolean()).map((
  [original, days, other, isAfter],
) => ({ original, now: isAfter ? DateTime.add(original.creationDate, { days }) : other }))

/**
 * Digits as typed, at times those of a day before the creation day, of a day after it, or of the stored date, in
 * the order in use or another.
 */
const typedDigits = (original: Product.Product, now: DateTime.Utc) =>
  fc.oneof(
    digits,
    fc.tuple(fc.integer({ min: -400, max: 400 }), order).map(([days, order]) =>
      DigitDates.digitsOf(DateTime.add(original.creationDate, { days }), order)
    ),
    fc.tuple(fc.integer({ min: 0, max: 400 }), order).map(([days, order]) =>
      DigitDates.digitsOf(DateTime.add(now, { days }), order).slice(0, 4)
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
    fc.tuple(typedDigits(form.original, form.now), fc.constantFrom('offered', 'other', 'none'), fc.nat(), utc).map((
      [digits, picked, index, other],
    ): DateForm => {
      const offered = DigitDateEntry.offered(
        { ...DigitDateEntry.empty, digits },
        form.now,
        form.order,
        Product.canExpireOn(form.original.creationDate),
      )
      const maybeChosenDate = picked === 'offered' && offered.length > 0
        ? Opt.fromNullishOr(offered[index % offered.length])
        : picked === 'other'
        ? Opt.some(other)
        : Opt.none()
      return { _tag: 'Typed', entry: { digits, maybeChosenDate } }
    }),
  )

// The name is often the stored one, at times with other spacing, and at times anything typed.
export const form: fc.Arbitrary<Form> = fc.tuple(opened, id, fc.nat(), order, fc.string(), fc.nat({ max: 3 })).chain((
  [{ original, now }, id, replacements, order, typed, kind],
) => {
  const name = kind === 0 ? original.name : kind === 1 ? ` ${original.name}  ` : kind === 2 ? '' : typed
  const rest = { id, original, name, replacements, now, order }
  return dateForm(rest).map((date): Form => ({ ...rest, date }))
})

// Never both known: the form is made as soon as they are.
export const loading = fc.tuple(id, opened, maybe(order), fc.boolean()).map((
  [id, { original, now }, maybeOrder, hasNow],
) => ({
  _tag: 'Loading',
  id,
  original,
  maybeNow: Opt.isSome(maybeOrder) || !hasNow ? Opt.none() : Opt.some(now),
  maybeOrder,
} as const))

export const editing = form.map((form) => ({ _tag: 'Editing', form } as const))

export const saving = fc.tuple(form, product).map(([form, product]) => ({ _tag: 'Saving', form, product } as const))

export const state: fc.Arbitrary<State> = fc.oneof(loading, editing, saving)

export const outcome = fc.constantFrom<Outcome>('Saved', 'Failed', 'Gone')

export const message: fc.Arbitrary<Message> = fc.oneof(
  fc.string().map((name) => Msg.NameChanged({ name })),
  fc.constant(Msg.NameCleared()),
  digit.map((digit) => Msg.DigitTyped({ digit })),
  fc.constant(Msg.DigitErased()),
  fc.constant(Msg.DateCleared()),
  utc.map((date) => Msg.DateChosen({ date })),
  order.map((order) => Msg.OrderPicked({ order })),
  fc.constant(Msg.SaveStarted()),
  fc.constant(Msg.Closed()),
  utc.map((now) => Msg.TimeChanged({ now })),
  order.map((order) => Msg.OrderChanged({ order })),
  fc.constant(Msg.BackPressed()),
  fc.boolean().map((succeeded) => Msg.OrderKept({ succeeded })),
  outcome.map((outcome) => Msg.Saved({ outcome })),
)
