import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import type { DateOrder } from './date-order.ts'

/** The most digits a date can be typed with: `DDMMYYYY`. */
export const MAX_DIGITS = 8

/** The day of `year`, `month` (from 1) and `day`, if the calendar has it, at its start. */
const dayOf = (year: number, month: number, day: number): Opt.Option<DateTime.Utc> => {
  const date = DateTime.makeUnsafe({ year, month, day })
  const parts = DateTime.toPartsUtc(date)
  return parts.year === year && parts.month === month && parts.day === day ? Opt.some(date) : Opt.none()
}

// A day with no year is the next one on or after today; February 29 may be up to eight years away.
const nextDayOf = (month: number, day: number, today: DateTime.Utc): Opt.Option<DateTime.Utc> => {
  const start = DateTime.startOf(today, 'day')
  const year = DateTime.getPartUtc(today, 'year')
  return Arr.findFirst(
    Arr.getSomes(Arr.makeBy(9, (offset) => dayOf(year + offset, month, day))),
    (date) => DateTime.isGreaterThanOrEqualTo(date, start),
  )
}

// A day with no month either is the next such day on or after today; the 30th may be two months away, past February.
const nextDayOfMonth = (day: number, today: DateTime.Utc): Opt.Option<DateTime.Utc> => {
  const firstOfMonth = DateTime.startOf(today, 'month')
  return Arr.findFirst(
    Arr.getSomes(Arr.makeBy(3, (offset) => {
      const { year, month } = DateTime.toPartsUtc(DateTime.add(firstOfMonth, { months: offset }))
      return dayOf(year, month, day)
    })),
    (date) => DateTime.isGreaterThanOrEqualTo(date, DateTime.startOf(today, 'day')),
  )
}

// Of two days as near, the later comes first: an expiration is more often ahead than behind.
const nearestFirst = (today: DateTime.Utc): Order.Order<DateTime.Utc> => {
  const start = DateTime.toEpochMillis(DateTime.startOf(today, 'day'))
  return Order.combine(
    Order.mapInput(Order.Number, (date: DateTime.Utc) => Math.abs(DateTime.toEpochMillis(date) - start)),
    Order.flip(DateTime.Order),
  )
}

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

const readingsOf = (digits: string, today: DateTime.Utc, order: DateOrder): ReadonlyArray<DateTime.Utc> => [
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
export const digitsOf = (date: DateTime.Utc, order: DateOrder): string => {
  const { year, month, day } = DateTime.toPartsUtc(date)
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
 * first as `order` says. With no month or no year, the day is the next one on or after `today`. The days start
 * at midnight, in UTC, the nearest to `today` first, without repeats. A string that is not only digits names
 * none.
 *
 * They are two at most: of the four ways to cut a day and a month, only those that leave the year 0, 2 or 4
 * digits read, and for a given count of digits, that is two of them. A day alone adds one only to one or two
 * digits, which a day and a month can cut in one way only.
 */
export const datesOf = (digits: string, today: DateTime.Utc, order: DateOrder): ReadonlyArray<DateTime.Utc> =>
  /^\d*$/.test(digits)
    ? Arr.dedupeWith(Arr.sort(readingsOf(digits, today, order), nearestFirst(today)), DateTime.Equivalence)
    : []
