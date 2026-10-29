// The rules of typing a date as digits on a keypad: which keys apply, which days the digits name, and which one
// of them is the date. A page keeps an `Entry` in its state and asks these rules what a key does to it.
import * as Arr from 'effect/Array'
import * as Opt from 'effect/Option'
import type { DateOrder } from './date-order.ts'
import type * as Day from './day.ts'
import * as DigitDates from './digit-dates.ts'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/** A date being typed: the digits, and the day picked among those they name, until a key changes them. */
export type Entry = Readonly<{ digits: string; maybeChosenDate: Opt.Option<Day.Day> }>

export const empty: Entry = { digits: '', maybeChosenDate: Opt.none() }

// New digits name other days: the day picked goes with the old ones.

/** The entry with `digit` typed after the others, or `None` once a date's longest is typed. */
export const typeDigit = (digit: Digit) => (entry: Entry): Opt.Option<Entry> =>
  entry.digits.length < DigitDates.MAX_DIGITS
    ? Opt.some({ digits: entry.digits + digit, maybeChosenDate: Opt.none() })
    : Opt.none()

/** The entry with its last digit erased, or `None` with nothing to erase. */
export const eraseDigit = (entry: Entry): Opt.Option<Entry> =>
  entry.digits !== '' ? Opt.some({ digits: entry.digits.slice(0, -1), maybeChosenDate: Opt.none() }) : Opt.none()

/** The entry with no digits, or `None` with nothing to clear. */
export const clear = (entry: Entry): Opt.Option<Entry> => entry.digits !== '' ? Opt.some(empty) : Opt.none()

/** The days the digits name, read in `order` from `today` (`DigitDates.datesOf`), among those `isAllowed`. */
export const offered = (
  entry: Entry,
  today: Day.Day,
  order: DateOrder,
  isAllowed: (date: Day.Day) => boolean,
): ReadonlyArray<Day.Day> => DigitDates.datesOf(entry.digits, today, order).filter(isAllowed)

/**
 * Whether the digits, or more typed after them, name a day `isAllowed` (`DigitDates.canComplete`): while they do,
 * digits that name none are a date not typed yet, not a wrong one.
 */
export const canComplete = (
  entry: Entry,
  today: Day.Day,
  order: DateOrder,
  isAllowed: (date: Day.Day) => boolean,
): boolean => DigitDates.canComplete(entry.digits, today, order, isAllowed)

const isAmong = (dates: ReadonlyArray<Day.Day>) => (date: Day.Day) => dates.includes(date)

/** The day the entry names: the one picked, while still offered, or else the only one offered. */
export const named = (entry: Entry, offered: ReadonlyArray<Day.Day>): Opt.Option<Day.Day> =>
  Opt.orElse(
    Opt.filter(entry.maybeChosenDate, isAmong(offered)),
    () => offered.length === 1 ? Arr.head(offered) : Opt.none(),
  )

/**
 * The entry with `date` picked, or `None` when it is not offered or is the day already named: a tap on the chosen
 * chip does nothing.
 */
export const choose = (date: Day.Day, offered: ReadonlyArray<Day.Day>) => (entry: Entry): Opt.Option<Entry> =>
  isAmong(offered)(date) && !Opt.contains(named(entry, offered), date)
    ? Opt.some({ ...entry, maybeChosenDate: Opt.some(date) })
    : Opt.none()
