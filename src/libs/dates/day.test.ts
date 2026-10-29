import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import { utc, zone, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import { assertProperty } from '#libs/testing/update.test_support.ts'
import { arbitrary as day } from './day.test_arbitrary.ts'
import * as Day from './day.ts'

const decode = Schema.decodeOption(Day.Schema)

describe('Day', () => {
  test('is exactly a day of the calendar written YYYY-MM-DD', () => {
    expect(decode('2026-10-30')).toEqual(Opt.some(Day.makeUnsafe({ year: 2026, month: 10, day: 30 })))
    expect(decode('2028-02-29')._tag).toBe('Some')
    expect(decode('2026-02-29')._tag).toBe('None')
    expect(decode('2026-04-31')._tag).toBe('None')
    expect(decode('2026-13-01')._tag).toBe('None')
    expect(decode('2026-1-01')._tag).toBe('None')
    expect(decode('2026-10-30T00:00:00Z')._tag).toBe('None')
  })

  test('is made from its parts, and gives them back', () => {
    assertProperty([day], (date) => Opt.contains(Day.make(Day.toParts(date)), date))
  })

  test('orders as the days do', () => {
    assertProperty([utc, utc], (a, b) =>
      Order.isLessThan(Day.Order)(Day.fromDateTime(a), Day.fromDateTime(b))
        === (Day.daysBetween(Day.fromDateTime(a), Day.fromDateTime(b)) > 0))
  })

  test('counts the days that it adds', () => {
    assertProperty(
      [day, fc.integer({ min: -1000, max: 1000 })],
      (date, days) => Day.daysBetween(date, Day.addDays(date, days)) === days,
    )
  })

  test('of a time is the day it falls on in its zone', () => {
    assertProperty([zoned], (now) => {
      const { year, month, day } = DateTime.toParts(now)
      return Opt.contains(Day.make({ year, month, day }), Day.fromDateTime(now))
    })
  })

  test('starts in a zone at its first instant there, whatever the clock changes', () => {
    assertProperty([day, zone], (date, zone) => {
      const start = Day.startIn(date, zone)
      return Day.fromDateTime(start) === date
        && Day.fromDateTime(DateTime.subtract(start, { milliseconds: 1 })) === Day.addDays(date, -1)
    })
  })

  // In UTC, it is already October 31 in New York at 20:30.
  test('of the evening in New York is the day there, not UTC\'s', () => {
    const now = DateTime.makeZonedUnsafe('2026-10-31T00:30:00Z', { timeZone: 'America/New_York' })
    expect(Day.fromDateTime(now)).toBe(Day.makeUnsafe({ year: 2026, month: 10, day: 30 }))
  })

  test('is written as the same day', () => {
    expect(Day.format(Day.makeUnsafe({ year: 2026, month: 10, day: 30 }), { day: 'numeric' })).toBe('30')
  })
})
