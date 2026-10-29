import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as Equal from 'effect/Equal'
import * as Order from 'effect/Order'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import { assertProperty } from '#libs/testing/update.test_support.ts'
import { arbitrary as order } from './date-order.test_arbitrary.ts'
import type { DateOrder } from './date-order.ts'
import { arbitrary as anyDay } from './day.test_arbitrary.ts'
import * as Day from './day.ts'
import { canComplete, datesOf, digitsOf, MAX_DIGITS } from './digit-dates.ts'

const digits = fc.string({ unit: fc.constantFrom(...'0123456789'), maxLength: MAX_DIGITS })

const isOnOrAfter = Order.isGreaterThanOrEqualTo(Day.Order)

/** The day `months` months before `date`'s, if that month has it. */
const monthsBefore = (date: Day.Day, months: number) => {
  const { year, month, day } = Day.toParts(date)
  const index = year * 12 + month - 1 - months
  return Day.make({ year: Math.floor(index / 12), month: index % 12 + 1, day })
}

/**
 * Every way `date` can be typed in `order`: the day alone, with or without a leading zero, or the day and the
 * month so, then no year, two or four, the year where the order puts it.
 */
const spellings = (date: Day.Day, today: Day.Day, order: DateOrder): ReadonlyArray<string> => {
  const { year, month, day } = Day.toParts(date)
  const both = (n: number) => Arr.dedupe([String(n), String(n).padStart(2, '0')])
  const years = [String(year).padStart(4, '0')]
  if (year >= 2000 && year <= 2099) years.push(String(year - 2000).padStart(2, '0'))
  // With no year, only the next such day is meant: none in the eight years before is on or after today.
  const earlierYears = Arr.getSomes(Arr.makeBy(8, (back) => monthsBefore(date, 12 * (back + 1))))
  if (isOnOrAfter(date, today) && earlierYears.every((before) => !isOnOrAfter(before, today))) years.push('')
  // With no month either, only the next such day is meant: none in the two months before is on or after today.
  const earlier = Arr.getSomes(Arr.makeBy(2, (back) => monthsBefore(date, back + 1)))
  const alone = isOnOrAfter(date, today) && earlier.every((before) => !isOnOrAfter(before, today)) ? both(day) : []
  return [
    ...alone,
    ...both(day).flatMap((d) =>
      both(month).flatMap((m) =>
        years.map((y) => order === 'DMY' ? d + m + y : order === 'MDY' ? m + d + y : y + m + d)
      )
    ),
  ]
}

/** How far `date` is from `today`, either way, in days. */
const distanceFrom = (today: Day.Day) => (date: Day.Day) => Math.abs(Day.daysBetween(today, date))

const sameDays = (a: ReadonlyArray<Day.Day>, b: ReadonlyArray<Day.Day>) => expect(a).toEqual(b)

const day = Schema.decodeSync(Day.Schema)

const today = day('2026-10-24')

describe('datesOf', () => {
  test('names only days that the digits spell in the order', () => {
    assertProperty(
      [digits, anyDay, order],
      (typed, today, order) =>
        datesOf(typed, today, order).every((date) => Arr.contains(spellings(date, today, order), typed)),
    )
  })

  test('names every day from each way it can be typed in the order', () => {
    assertProperty(
      [anyDay, anyDay, order],
      (date, now, order) =>
        spellings(date, now, order).every((typed) => datesOf(typed, now, order).some((named) => named === date)),
    )
  })

  test('names a day with no year on the next such day, today included', () => {
    const offsets = fc.integer({ min: 0, max: 364 })
    assertProperty([anyDay, offsets, order], (now, offset, order) => {
      const date = Day.addDays(now, offset)
      const { month, day } = Day.toParts(date)
      const [d, m] = [String(day).padStart(2, '0'), String(month).padStart(2, '0')]
      const typed = order === 'DMY' ? d + m : m + d
      return datesOf(typed, now, order).some((named) => named === date)
    })
  })

  test('names a day alone on the next such day, today included', () => {
    const offsets = fc.integer({ min: 0, max: 27 })
    assertProperty([anyDay, offsets, order], (now, offset, order) => {
      const date = Day.addDays(now, offset)
      const typed = String(Day.toParts(date).day)
      return datesOf(typed, now, order).some((named) => named === date)
    })
  })

  test('sorts the days nearest to today first, the later of two as near, without repeats', () => {
    assertProperty([digits, anyDay, order], (typed, now, order) => {
      const dates = datesOf(typed, now, order)
      const distance = distanceFrom(now)
      return Arr.zip(dates, dates.slice(1)).every(([first, second]) =>
        distance(first) < distance(second)
        || (distance(first) === distance(second) && Order.isGreaterThan(Day.Order)(first, second))
      )
    })
  })

  // The view relies on it: two chips fit a row of the narrowest phone.
  test('names two days at most', () => {
    assertProperty([digits, anyDay, order], (typed, now, order) => datesOf(typed, now, order).length <= 2)
  })

  test('names nothing from what is not only digits', () => {
    assertProperty(
      [fc.string().filter((text) => /\D/.test(text)), anyDay, order],
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
  /** Days on or after `from`: what `canComplete` takes, every later day allowed. */
  const onOrAfter = (from: Day.Day) => (date: Day.Day) => isOnOrAfter(date, from)

  /** Every string of digits up to `length` long. */
  const allDigits = (length: number): ReadonlyArray<string> =>
    length === 0 ? [''] : ['', ...allDigits(length - 1).flatMap((rest) => [...'0123456789'].map((d) => d + rest))]

  test('holds for every beginning of a way to type an allowed day', () => {
    assertProperty([anyDay, anyDay, anyDay, order], (date, now, from, order) =>
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
      [typed, anyDay, anyDay, order],
      (typed, now, from, order) =>
        canComplete(typed, now, order, onOrAfter(from))
          === allDigits(MAX_DIGITS - typed.length).some((more) =>
            datesOf(typed + more, now, order).some(onOrAfter(from))
          ),
    )
  })

  test('holds whenever the digits name an allowed day', () => {
    assertProperty(
      [digits, anyDay, anyDay, order],
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
      [anyDay, anyDay, order],
      (date, now, order) =>
        Equal.equals(datesOf(digitsOf(date, order), now, order), [date])
        && digitsOf(date, order).length === MAX_DIGITS,
    )
  })

  test('writes the day, the month and the year where the order puts them', () => {
    expect(digitsOf(day('2027-03-05'), 'DMY')).toBe('05032027')
    expect(digitsOf(day('2027-03-05'), 'MDY')).toBe('03052027')
    expect(digitsOf(day('2027-03-05'), 'YMD')).toBe('20270305')
  })
})
