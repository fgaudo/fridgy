import { describe, test } from 'bun:test'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as fc from 'fast-check'
import { assertProperty } from '#libs/testing/update.test_support.ts'
import { arbitrary as order } from './date-order.test_arbitrary.ts'
import type { DateOrder } from './date-order.ts'
import { arbitrary as anyDay } from './day.test_arbitrary.ts'
import * as Day from './day.ts'
import { digit, digits } from './digit-date-entry.test_arbitrary.ts'
import { choose, clear, type Entry, empty, eraseDigit, named, offered, typeDigit } from './digit-date-entry.ts'
import { datesOf, MAX_DIGITS } from './digit-dates.ts'

/** An entry whose day picked is at times one the digits name from `today` in `order`, at times another, or none. */
const entry: fc.Arbitrary<Readonly<{ entry: Entry; today: Day.Day; order: DateOrder }>> = fc.tuple(
  digits,
  anyDay,
  order,
  fc.constantFrom('offered', 'other', 'none'),
  fc.nat(),
  anyDay,
).map((
  [digits, today, order, picked, index, other],
) => {
  const days = datesOf(digits, today, order)
  const maybeChosenDate = picked === 'offered' && days.length > 0
    ? Opt.fromNullishOr(days[index % days.length])
    : picked === 'other'
    ? Opt.some(other)
    : Opt.none()
  return { entry: { digits, maybeChosenDate }, today, order }
})

const always = () => true

describe('the keys', () => {
  test('a digit is typed after the others, the day picked forgotten, until a date\'s longest is typed', () => {
    assertProperty([entry, digit], ({ entry }, typed) =>
      Equal.equals(
        typeDigit(typed)(entry),
        entry.digits.length < MAX_DIGITS
          ? Opt.some({ digits: entry.digits + typed, maybeChosenDate: Opt.none() })
          : Opt.none(),
      ))
  })

  test('the backspace erases the last digit, the day picked forgotten, and does nothing with no digits', () => {
    assertProperty([entry], ({ entry }) =>
      Equal.equals(
        eraseDigit(entry),
        entry.digits === '' ? Opt.none() : Opt.some({ digits: entry.digits.slice(0, -1), maybeChosenDate: Opt.none() }),
      ))
  })

  test('the clear key erases every digit and the day picked, and does nothing with no digits', () => {
    assertProperty(
      [entry],
      ({ entry }) => Equal.equals(clear(entry), entry.digits === '' ? Opt.none() : Opt.some(empty)),
    )
  })
})

describe('the days', () => {
  test('offered are the days the digits name that are allowed', () => {
    assertProperty([entry, anyDay], ({ entry, today, order }, bound) => {
      const isAllowed = (date: Day.Day) => Order.isGreaterThanOrEqualTo(Day.Order)(date, bound)
      return Equal.equals(
        offered(entry, today, order, isAllowed),
        datesOf(entry.digits, today, order).filter(isAllowed),
      )
    })
  })

  test('named is the day picked while it is offered, or else the only day offered', () => {
    assertProperty([entry], ({ entry, today, order }) => {
      const days = offered(entry, today, order, always)
      const isOffered = Opt.exists(entry.maybeChosenDate, (date) => days.includes(date))
      return Equal.equals(
        named(entry, days),
        isOffered ? entry.maybeChosenDate : days.length === 1 ? Opt.fromNullishOr(days[0]) : Opt.none(),
      )
    })
  })

  test('choose picks an offered day other than the one named, and does nothing on any other', () => {
    assertProperty([entry, anyDay], ({ entry, today, order }, other) => {
      const days = offered(entry, today, order, always)
      return [...days, other].every((date) => {
        const isOffered = days.includes(date)
        return Equal.equals(
          choose(date, days)(entry),
          isOffered && !Opt.contains(named(entry, days), date)
            ? Opt.some({ ...entry, maybeChosenDate: Opt.some(date) })
            : Opt.none(),
        )
      })
    })
  })

  test('once a day is chosen, it is the day named', () => {
    assertProperty([entry], ({ entry, today, order }) => {
      const days = offered(entry, today, order, always)
      return days.every((date) =>
        Opt.match(choose(date, days)(entry), {
          onNone: () => Opt.contains(named(entry, days), date),
          onSome: (chosen) => Opt.contains(named(chosen, days), date),
        })
      )
    })
  })
})
