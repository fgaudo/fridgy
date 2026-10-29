// A day of the calendar: a year, a month and a day, with no time and no zone. It is the same day wherever it is
// read; an instant falls on a day only in a zone (`fromDateTime`).
import * as DateTime from 'effect/DateTime'
import type * as Opt from 'effect/Option'
import * as Order_ from 'effect/Order'
import * as _Schema from 'effect/Schema'

type Parts = Readonly<{ year: number; month: number; day: number }>

// The day's midnight in UTC: what its arithmetic and its formatting are done on. It is never shown as a moment.
const utcMidnightOf = ({ year, month, day }: Parts) => DateTime.makeUnsafe({ year, month, day })

const isOnCalendar = (text: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (match === null) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const parts = DateTime.toPartsUtc(utcMidnightOf({ year, month, day }))
  return parts.year === year && parts.month === month && parts.day === day
}

/** A day of the calendar, written `YYYY-MM-DD`, from year 0 to 9999: its text orders as the days do. */
export const Schema = _Schema.String.check(_Schema.makeFilter(isOnCalendar, { expected: 'a day as YYYY-MM-DD' })).pipe(
  _Schema.brand('libs.Day'),
)

export type Day = typeof Schema.Type

const decode: (text: string) => Opt.Option<Day> = _Schema.decodeOption(Schema)
const decodeUnsafe: (text: string) => Day = _Schema.decodeSync(Schema)

const textOf = ({ year, month, day }: Parts) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** The day of `year`, `month` (from 1) and `day`, if the calendar has it. */
export const make = (parts: Parts): Opt.Option<Day> => decode(textOf(parts))

/** The day of `year`, `month` and `day`, known to be on the calendar. */
export const makeUnsafe = (parts: Parts): Day => decodeUnsafe(textOf(parts))

/** The day `date` falls on in its own zone: UTC's, for a `DateTime.Utc`. */
export const fromDateTime = (date: DateTime.DateTime): Day => makeUnsafe(DateTime.toParts(date))

export const toParts = (day: Day): Parts => {
  const [year = 0, month = 0, date = 0] = day.split('-').map(Number)
  return { year, month, day: date }
}

export const Order: Order_.Order<Day> = Order_.String

/** The day `days` days after `day`, or before it when negative. */
export const addDays = (day: Day, days: number): Day =>
  fromDateTime(DateTime.add(utcMidnightOf(toParts(day)), { days }))

const DAY_MILLIS = 86_400_000

/** The days from `from` to `to`: negative when `to` comes first. */
export const daysBetween = (from: Day, to: Day): number =>
  (DateTime.toEpochMillis(utcMidnightOf(toParts(to))) - DateTime.toEpochMillis(utcMidnightOf(toParts(from))))
  / DAY_MILLIS

/** The first instant of `day` in `zone`: its midnight, or the hour after a midnight that a clock change skips. */
export const startIn = (day: Day, zone: DateTime.TimeZone): DateTime.Zoned =>
  DateTime.makeZonedUnsafe(toParts(day), { timeZone: zone, adjustForTimeZone: true, disambiguation: 'compatible' })

/** `day` written with `options` (`Intl.DateTimeFormat`'s): the same day, in every zone. */
export const format = (day: Day, options: Intl.DateTimeFormatOptions): string =>
  DateTime.formatUtc(utcMidnightOf(toParts(day)), options)
