import * as Arr from 'effect/Array'
import * as Iterable from 'effect/Iterable'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import type { DateOrder } from './date-order.ts'
import * as Day from './day.ts'

/** The most digits a date can be typed with: `DDMMYYYY`. */
export const MAX_DIGITS = 8

/** The day of `year`, `month` (from 1) and `day`, if the calendar has it. */
const dayOf = (year: number, month: number, day: number): Opt.Option<Day.Day> => Day.make({ year, month, day })

const isOnOrAfter = Order.isGreaterThanOrEqualTo(Day.Order)

// A day with no year is the next one on or after today; February 29 may be up to eight years away.
const nextDayOf = (month: number, day: number, today: Day.Day): Opt.Option<Day.Day> =>
  Arr.findFirst(
    Arr.getSomes(Arr.makeBy(9, (offset) => dayOf(Day.toParts(today).year + offset, month, day))),
    (date) => isOnOrAfter(date, today),
  )

// A day with no month either is the next such day on or after today; the 30th may be two months away, past February.
const nextDayOfMonth = (day: number, today: Day.Day): Opt.Option<Day.Day> => {
  const { year, month } = Day.toParts(today)
  return Arr.findFirst(
    Arr.getSomes(
      Arr.makeBy(
        3,
        (offset) => dayOf(year + Math.floor((month - 1 + offset) / 12), (month - 1 + offset) % 12 + 1, day),
      ),
    ),
    (date) => isOnOrAfter(date, today),
  )
}

// Of two days as near, the later comes first: an expiration is more often ahead than behind.
const nearestFirst = (today: Day.Day): Order.Order<Day.Day> =>
  Order.combine(
    Order.mapInput(Order.Number, (date: Day.Day) => Math.abs(Day.daysBetween(today, date))),
    Order.flip(Day.Order),
  )

type Field = 'day' | 'month' | 'year'

const fieldsIn: Readonly<Record<DateOrder, ReadonlyArray<Field>>> = {
  DMY: ['day', 'month', 'year'],
  MDY: ['month', 'day', 'year'],
  YMD: ['year', 'month', 'day'],
}

/** The digits cut into the fields, each as long as given, in the order they are typed in. */
const fieldsOf = (digits: string, order: DateOrder, lengths: Readonly<Record<Field, number>>) => {
  const fields: Record<Field, string> = { day: '', month: '', year: '' }
  let from = 0
  for (const field of fieldsIn[order]) {
    fields[field] = digits.slice(from, from + lengths[field])
    from += lengths[field]
  }
  return fields
}

const readingsOf = (digits: string, today: Day.Day, order: DateOrder): ReadonlyArray<Day.Day> => [
  ...(digits.length === 1 || digits.length === 2 ? Opt.toArray(nextDayOfMonth(Number(digits), today)) : []),
  ...[1, 2].flatMap((dayLength) =>
    [1, 2].flatMap((monthLength) => {
      const yearLength = digits.length - dayLength - monthLength
      if (yearLength < 0) return []
      const { day, month, year } = fieldsOf(digits, order, { day: dayLength, month: monthLength, year: yearLength })
      switch (yearLength) {
        case 0:
          return Opt.toArray(nextDayOf(Number(month), Number(day), today))
        // Two digits name a year of this century.
        case 2:
          return Opt.toArray(dayOf(2000 + Number(year), Number(month), Number(day)))
        case 4:
          return Opt.toArray(dayOf(Number(year), Number(month), Number(day)))
        default:
          return []
      }
    })
  ),
]

/**
 * The digits that name `date` alone in `order`: a date's longest form, a day and a month of two digits each and a
 * year of four (`DDMMYYYY` in `DMY`). Eight digits name one day at most (see `datesOf`).
 */
export const digitsOf = (date: Day.Day, order: DateOrder): string => {
  const { year, month, day } = Day.toParts(date)
  const fields: Readonly<Record<Field, string>> = {
    day: String(day).padStart(2, '0'),
    month: String(month).padStart(2, '0'),
    year: String(year).padStart(4, '0'),
  }
  return fieldsIn[order].map((field) => fields[field]).join('')
}

/**
 * The days that `digits`, typed with no separators in `order`, can name: a day of one or two digits alone, or a
 * day and a month of one or two digits each, and no year, two digits (this century) or four, the year last or
 * first as `order` says. With no month or no year, the day is the next one on or after `today`. They come the
 * nearest to `today` first, without repeats. A string that is not only digits names none.
 *
 * They are two at most: of the four ways to cut a day and a month, only those that leave the year 0, 2 or 4
 * digits read, and for a given count of digits, that is two of them. A day alone adds one only to one or two
 * digits, which a day and a month can cut in one way only.
 */
export const datesOf = (digits: string, today: Day.Day, order: DateOrder): ReadonlyArray<Day.Day> =>
  /^\d*$/.test(digits)
    ? Arr.dedupe(Arr.sort(readingsOf(digits, today, order), nearestFirst(today)))
    : []

/** `value` written in `length` digits, or `None` when it needs more. A field of one digit is never `0`. */
const written = (value: number, length: number): Opt.Option<string> =>
  value > 0 && String(value).length <= length ? Opt.some(String(value).padStart(length, '0')) : Opt.none()

/** Whether `text`, as a field from `from` on, agrees with what is typed there: nothing is, past the end. */
const agrees = (digits: string, from: number) => (text: string) =>
  text.split('').every((digit, at) => (digits[from + at] ?? digit) === digit)

/** The values from 1 to `count` that agree, written in a field of `length` digits from `from` on. */
const valuesAgreeing = (count: number, length: number, digits: string, from: number): ReadonlyArray<number> =>
  Arr.makeBy(count, (index) => index + 1).filter((value) => Opt.exists(written(value, length), agrees(digits, from)))

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/** The latest leap year that agrees, written in a field of `length` digits from `from` on. */
const latestLeapYear = (length: number, digits: string, from: number, yearOf: (text: string) => number) => {
  for (let value = 10 ** length - 1; value >= 0; value--) {
    const text = String(value).padStart(length, '0')
    if (agrees(digits, from)(text) && isLeap(yearOf(text))) return Opt.some(yearOf(text))
  }
  return Opt.none()
}

// For each way to cut the digits and each day and month they agree with, only the latest year is tried, as a later
// day is allowed wherever an earlier one is; February 29 takes the latest leap year. Lazy, as the first allowed day
// ends the search.
function* completions(digits: string, today: Day.Day, order: DateOrder): Generator<Day.Day> {
  for (const length of [1, 2].filter((length) => length >= digits.length)) {
    for (const day of valuesAgreeing(31, length, digits, 0)) yield* Opt.toArray(nextDayOfMonth(day, today))
  }
  for (const dayLength of [1, 2]) {
    for (const monthLength of [1, 2]) {
      for (const yearLength of [0, 2, 4].filter((length) => dayLength + monthLength + length >= digits.length)) {
        const lengths: Readonly<Record<Field, number>> = { day: dayLength, month: monthLength, year: yearLength }
        const fields = fieldsIn[order]
        const from = (field: Field) =>
          fields.slice(0, fields.indexOf(field)).reduce((sum, before) => sum + lengths[before], 0)
        // Two digits name a year of this century, as in `readingsOf`.
        const yearOf = (text: string) => yearLength === 2 ? 2000 + Number(text) : Number(text)
        const latestYear = yearOf(Arr.makeBy(yearLength, (at) => digits[from('year') + at] ?? '9').join(''))
        for (const month of valuesAgreeing(12, monthLength, digits, from('month'))) {
          for (const day of valuesAgreeing(31, dayLength, digits, from('day'))) {
            yield* Opt.toArray(
              yearLength === 0
                ? nextDayOf(month, day, today)
                : month === 2 && day === 29
                ? Opt.flatMap(latestLeapYear(yearLength, digits, from('year'), yearOf), (year) => dayOf(year, 2, 29))
                : dayOf(latestYear, month, day),
            )
          }
        }
      }
    }
  }
}

/**
 * Whether `digits`, or some more digits typed after them, up to `MAX_DIGITS`, name a day that `isAllowed` (see
 * `datesOf`). `isAllowed` must allow every day after one it allows.
 */
export const canComplete = (
  digits: string,
  today: Day.Day,
  order: DateOrder,
  isAllowed: (date: Day.Day) => boolean,
): boolean => /^\d*$/.test(digits) && Iterable.some(completions(digits, today, order), isAllowed)
