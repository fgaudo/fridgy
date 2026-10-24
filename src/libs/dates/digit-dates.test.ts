import { describe, expect, test } from 'bun:test'
import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty } from '#libs/testing/update.test_support.ts'
import { datesOf, MAX_DIGITS } from './digit-dates.ts'

const digits = fc.string({ unit: fc.constantFrom(...'0123456789'), maxLength: MAX_DIGITS })

/** Every way `date` can be typed: the day and the month with or without a leading zero, then no year, two or four. */
const spellings = (date: DateTime.Utc, today: DateTime.Utc): ReadonlyArray<string> => {
  const { year, month, day } = DateTime.toPartsUtc(date)
  const both = (n: number) => Arr.dedupe([String(n), String(n).padStart(2, '0')])
  const years = [String(year).padStart(4, '0')]
  if (year >= 2000 && year <= 2099) years.push(String(year - 2000).padStart(2, '0'))
  // With no year, only the next such day is meant.
  const nextYear = DateTime.add(DateTime.startOf(today, 'day'), { years: 1 })
  if (DateTime.isGreaterThanOrEqualTo(date, DateTime.startOf(today, 'day')) && DateTime.isLessThan(date, nextYear)) {
    years.push('')
  }
  return both(day).flatMap((d) => both(month).flatMap((m) => years.map((y) => d + m + y)))
}

const sameDays = (a: ReadonlyArray<DateTime.Utc>, b: ReadonlyArray<DateTime.Utc>) =>
  expect(a.map(DateTime.formatIsoDateUtc)).toEqual(b.map(DateTime.formatIsoDateUtc))

const today = DateTime.makeUnsafe('2026-10-24T15:30:00Z')

const day = (iso: string) => DateTime.makeUnsafe(`${iso}T00:00:00Z`)

describe('datesOf', () => {
  test('names only days that the digits spell, at their start', () => {
    assertProperty(
      [digits, utc],
      (typed, now) =>
        datesOf(typed, now).every((date) =>
          Arr.contains(spellings(date, now), typed) && DateTime.Equivalence(date, DateTime.startOf(date, 'day'))
        ),
    )
  })

  test('names every day from each way it can be typed', () => {
    const days = utc.map((date) => DateTime.startOf(date, 'day'))
    assertProperty(
      [days, utc],
      (date, now) =>
        spellings(date, now).every((typed) => datesOf(typed, now).some((named) => DateTime.Equivalence(named, date))),
    )
  })

  test('names a day with no year on the next such day, today included', () => {
    const offsets = fc.integer({ min: 0, max: 364 })
    assertProperty([utc, offsets], (now, offset) => {
      const date = DateTime.add(DateTime.startOf(now, 'day'), { days: offset })
      const { month, day } = DateTime.toPartsUtc(date)
      const typed = String(day).padStart(2, '0') + String(month).padStart(2, '0')
      return datesOf(typed, now).some((named) => DateTime.Equivalence(named, date))
    })
  })

  test('sorts the days, without repeats', () => {
    assertProperty([digits, utc], (typed, now) => {
      const dates = datesOf(typed, now)
      return Arr.zip(dates, dates.slice(1)).every(([earlier, later]) => DateTime.isLessThan(earlier, later))
    })
  })

  test('names nothing from what is not only digits', () => {
    assertProperty([fc.string().filter((text) => /\D/.test(text)), utc], (text, now) => datesOf(text, now).length === 0)
  })

  test('reads the examples as a person would', () => {
    sameDays(datesOf('1212', today), [day('2012-02-01'), day('2026-12-12')])
    sameDays(datesOf('111', today), [day('2026-11-01'), day('2027-01-11')])
    sameDays(datesOf('0503', today), [day('2027-03-05')])
    sameDays(datesOf('21227', today), [day('2027-02-21'), day('2027-12-02')])
    sameDays(datesOf('24102026', today), [day('2026-10-24')])
    sameDays(datesOf('2902', today), [day('2002-09-02'), day('2028-02-29')])
    sameDays(datesOf('1', today), [])
    sameDays(datesOf('4040', today), [])
  })
})
