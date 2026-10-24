import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'

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

const readingsOf = (digits: string, today: DateTime.Utc): ReadonlyArray<DateTime.Utc> =>
  [1, 2].flatMap((dayLength) =>
    [1, 2].flatMap((monthLength) => {
      const yearDigits = digits.slice(dayLength + monthLength)
      if (digits.length < dayLength + monthLength) return []
      const day = Number(digits.slice(0, dayLength))
      const month = Number(digits.slice(dayLength, dayLength + monthLength))
      switch (yearDigits.length) {
        case 0:
          return Opt.toArray(nextDayOf(month, day, today))
        // Two digits name a year of this century.
        case 2:
          return Opt.toArray(dayOf(2000 + Number(yearDigits), month, day))
        case 4:
          return Opt.toArray(dayOf(Number(yearDigits), month, day))
        default:
          return []
      }
    })
  )

/**
 * The days that `digits`, typed with no separators, can name: a day and a month of one or two digits each, then
 * no year, two digits (this century) or four. With no year, the day is the next one on or after `today`. The
 * days start at midnight, in UTC, and are sorted, without repeats. A string that is not only digits names none.
 */
export const datesOf = (digits: string, today: DateTime.Utc): ReadonlyArray<DateTime.Utc> =>
  /^\d*$/.test(digits)
    ? Arr.dedupeWith(Arr.sort(readingsOf(digits, today), DateTime.Order), DateTime.Equivalence)
    : []
