import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty } from '#libs/testing/update.test_support.ts'
import { arbitrary as order } from './date-order.test_arbitrary.ts'
import type { DateOrder } from './date-order.ts'
import { canComplete, datesOf, digitsOf, MAX_DIGITS } from './digit-dates.ts'

const digits = fc.string({ unit: fc.constantFrom(...'0123456789'), maxLength: MAX_DIGITS })

/**
 * Every way `date` can be typed in `order`: the day alone, with or without a leading zero, or the day and the
 * month so, then no year, two or four, the year where the order puts it.
 */
const spellings = (date: DateTime.Utc, today: DateTime.Utc, order: DateOrder): ReadonlyArray<string> => {
  const { year, month, day } = DateTime.toPartsUtc(date)
  const both = (n: number) => Arr.dedupe([String(n), String(n).padStart(2, '0')])
  const start = DateTime.startOf(today, 'day')
  const years = [String(year).padStart(4, '0')]
  if (year >= 2000 && year <= 2099) years.push(String(year - 2000).padStart(2, '0'))
  // With no year, only the next such day is meant: none in the eight years before is on or after today.
  const earlierYears = Arr.makeBy(8, (back) => DateTime.subtract(date, { years: back + 1 }))
    .filter((before) => DateTime.getPartUtc(before, 'day') === day)
  if (
    DateTime.isGreaterThanOrEqualTo(date, start) && earlierYears.every((before) => DateTime.isLessThan(before, start))
  ) years.push('')
  // With no month either, only the next such day is meant: none in the two months before is on or after today.
  const earlier = Arr.makeBy(2, (back) => DateTime.subtract(date, { months: back + 1 }))
    .filter((before) => DateTime.getPartUtc(before, 'day') === day)
  const alone = DateTime.isGreaterThanOrEqualTo(date, start)
      && earlier.every((before) => DateTime.isLessThan(before, start))
    ? both(day)
    : []
  return [
    ...alone,
    ...both(day).flatMap((d) =>
      both(month).flatMap((m) =>
        years.map((y) => order === 'DMY' ? d + m + y : order === 'MDY' ? m + d + y : y + m + d)
      )
    ),
  ]
}

/** How far `date` is from the start of `today`, either way. */
const distanceFrom = (today: DateTime.Utc) => (date: DateTime.Utc) =>
  Math.abs(DateTime.toEpochMillis(date) - DateTime.toEpochMillis(DateTime.startOf(today, 'day')))

const sameDays = (a: ReadonlyArray<DateTime.Utc>, b: ReadonlyArray<DateTime.Utc>) =>
  expect(a.map(DateTime.formatIsoDateUtc)).toEqual(b.map(DateTime.formatIsoDateUtc))

const today = DateTime.makeUnsafe('2026-10-24T15:30:00Z')

const day = (iso: string) => DateTime.makeUnsafe(`${iso}T00:00:00Z`)

describe('datesOf', () => {
  test('names only days that the digits spell in the order, at their start', () => {
    assertProperty(
      [digits, utc, order],
      (typed, now, order) =>
        datesOf(typed, now, order).every((date) =>
          Arr.contains(spellings(date, now, order), typed) && DateTime.Equivalence(date, DateTime.startOf(date, 'day'))
        ),
    )
  })

  test('names every day from each way it can be typed in the order', () => {
    const days = utc.map((date) => DateTime.startOf(date, 'day'))
    assertProperty(
      [days, utc, order],
      (date, now, order) =>
        spellings(date, now, order).every((typed) =>
          datesOf(typed, now, order).some((named) => DateTime.Equivalence(named, date))
        ),
    )
  })

  test('names a day with no year on the next such day, today included', () => {
    const offsets = fc.integer({ min: 0, max: 364 })
    assertProperty([utc, offsets, order], (now, offset, order) => {
      const date = DateTime.add(DateTime.startOf(now, 'day'), { days: offset })
      const { month, day } = DateTime.toPartsUtc(date)
      const [d, m] = [String(day).padStart(2, '0'), String(month).padStart(2, '0')]
      const typed = order === 'DMY' ? d + m : m + d
      return datesOf(typed, now, order).some((named) => DateTime.Equivalence(named, date))
    })
  })

  test('names a day alone on the next such day, today included', () => {
    const offsets = fc.integer({ min: 0, max: 27 })
    assertProperty([utc, offsets, order], (now, offset, order) => {
      const date = DateTime.add(DateTime.startOf(now, 'day'), { days: offset })
      const typed = String(DateTime.getPartUtc(date, 'day'))
      return datesOf(typed, now, order).some((named) => DateTime.Equivalence(named, date))
    })
  })

  test('sorts the days nearest to today first, the later of two as near, without repeats', () => {
    assertProperty([digits, utc, order], (typed, now, order) => {
      const dates = datesOf(typed, now, order)
      const distance = distanceFrom(now)
      return Arr.zip(dates, dates.slice(1)).every(([first, second]) =>
        distance(first) < distance(second)
        || (distance(first) === distance(second) && DateTime.isGreaterThan(first, second))
      )
    })
  })

  // The view relies on it: two chips fit a row of the narrowest phone.
  test('names two days at most', () => {
    assertProperty([digits, utc, order], (typed, now, order) => datesOf(typed, now, order).length <= 2)
  })

  test('names nothing from what is not only digits', () => {
    assertProperty(
      [fc.string().filter((text) => /\D/.test(text)), utc, order],
      (text, now, order) => datesOf(text, now, order).length === 0,
    )
  })

  test('reads the examples as a person would, the day first', () => {
    sameDays(datesOf('1212', today, 'DMY'), [day('2026-12-12'), day('2012-02-01')])
    sameDays(datesOf('111', today, 'DMY'), [day('2026-11-01'), day('2027-01-11')])
    sameDays(datesOf('0503', today, 'DMY'), [day('2027-03-05')])
    sameDays(datesOf('21227', today, 'DMY'), [day('2027-02-21'), day('2027-12-02')])
    sameDays(datesOf('24102026', today, 'DMY'), [day('2026-10-24')])
    sameDays(datesOf('2902', today, 'DMY'), [day('2028-02-29'), day('2002-09-02')])
    sameDays(datesOf('31', today, 'DMY'), [day('2026-10-31'), day('2027-01-03')])
    sameDays(datesOf('24', today, 'DMY'), [day('2026-10-24'), day('2027-04-02')])
    sameDays(datesOf('1', today, 'DMY'), [day('2026-11-01')])
    sameDays(datesOf('05', today, 'DMY'), [day('2026-11-05')])
    sameDays(datesOf('30', day('2027-01-31'), 'DMY'), [day('2027-03-30')])
    sameDays(datesOf('0', today, 'DMY'), [])
    sameDays(datesOf('4040', today, 'DMY'), [])
  })

  test('reads the examples as a person would, the month first', () => {
    sameDays(datesOf('1212', today, 'MDY'), [day('2026-12-12'), day('2012-01-02')])
    sameDays(datesOf('31', today, 'MDY'), [day('2026-10-31'), day('2027-03-01')])
    sameDays(datesOf('111', today, 'MDY'), [day('2026-11-01'), day('2027-01-11')])
    sameDays(datesOf('0305', today, 'MDY'), [day('2027-03-05')])
    sameDays(datesOf('12227', today, 'MDY'), [day('2027-01-22'), day('2027-12-02')])
    sameDays(datesOf('10242026', today, 'MDY'), [day('2026-10-24')])
    sameDays(datesOf('0229', today, 'MDY'), [day('2028-02-29')])
    sameDays(datesOf('4040', today, 'MDY'), [])
  })

  test('reads the examples as a person would, the year first', () => {
    sameDays(datesOf('1212', today, 'YMD'), [day('2026-12-12'), day('2012-01-02')])
    sameDays(datesOf('31', today, 'YMD'), [day('2026-10-31'), day('2027-03-01')])
    sameDays(datesOf('111', today, 'YMD'), [day('2026-11-01'), day('2027-01-11')])
    sameDays(datesOf('0305', today, 'YMD'), [day('2027-03-05')])
    sameDays(datesOf('27122', today, 'YMD'), [day('2027-01-22'), day('2027-12-02')])
    sameDays(datesOf('20261024', today, 'YMD'), [day('2026-10-24')])
    sameDays(datesOf('4040', today, 'YMD'), [])
  })
})

describe('canComplete', () => {
  /** Days on or after the start of the day of `from`: what `canComplete` takes, every later day allowed. */
  const onOrAfter = (from: DateTime.Utc) => (date: DateTime.Utc) =>
    DateTime.isGreaterThanOrEqualTo(date, DateTime.startOf(from, 'day'))

  /** Every string of digits up to `length` long. */
  const allDigits = (length: number): ReadonlyArray<string> =>
    length === 0 ? [''] : ['', ...allDigits(length - 1).flatMap((rest) => [...'0123456789'].map((d) => d + rest))]

  test('holds for every beginning of a way to type an allowed day', () => {
    const days = utc.map((date) => DateTime.startOf(date, 'day'))
    assertProperty([days, utc, utc, order], (date, now, from, order) =>
      !onOrAfter(from)(date)
      || spellings(date, now, order).every((typed) =>
        Arr.makeBy(typed.length + 1, (length) => typed.slice(0, length)).every((start) =>
          canComplete(start, now, order, onOrAfter(from))
        )
      ))
  })

  test('holds from five digits on only when some digits typed after them name an allowed day', () => {
    const typed = fc.string({ unit: fc.constantFrom(...'0123456789'), minLength: 5, maxLength: MAX_DIGITS })
    assertProperty(
      [typed, utc, utc, order],
      (typed, now, from, order) =>
        canComplete(typed, now, order, onOrAfter(from))
          === allDigits(MAX_DIGITS - typed.length).some((more) =>
            datesOf(typed + more, now, order).some(onOrAfter(from))
          ),
    )
  })

  test('holds whenever the digits name an allowed day', () => {
    assertProperty(
      [digits, utc, utc, order],
      (typed, now, from, order) =>
        !datesOf(typed, now, order).some(onOrAfter(from)) || canComplete(typed, now, order, onOrAfter(from)),
    )
  })

  test('reads the examples as a person would, the day first', () => {
    const allowed = onOrAfter(today)
    expect(canComplete('', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('0', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('24102', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('241020', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('2410202', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('290220', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('2902202', today, 'DMY', allowed)).toBe(true)
    expect(canComplete('2902202', today, 'DMY', onOrAfter(day('2030-01-01')))).toBe(false)
    expect(canComplete('00', today, 'DMY', allowed)).toBe(false)
    expect(canComplete('4040', today, 'DMY', allowed)).toBe(false)
    expect(canComplete('2310201', today, 'DMY', allowed)).toBe(false)
    expect(canComplete('23102026', today, 'DMY', allowed)).toBe(false)
    expect(canComplete('2a', today, 'DMY', allowed)).toBe(false)
  })
})

describe('digitsOf', () => {
  test('names its day alone, in every order, from any today', () => {
    assertProperty(
      [utc, utc, order],
      (date, now, order) =>
        Equal.equals(datesOf(digitsOf(date, order), now, order), [DateTime.startOf(date, 'day')])
        && digitsOf(date, order).length === MAX_DIGITS,
    )
  })

  test('writes the day, the month and the year where the order puts them', () => {
    expect(digitsOf(day('2027-03-05'), 'DMY')).toBe('05032027')
    expect(digitsOf(day('2027-03-05'), 'MDY')).toBe('03052027')
    expect(digitsOf(day('2027-03-05'), 'YMD')).toBe('20270305')
  })
})
