import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as Order from 'effect/Order'
import * as Schema from 'effect/Schema'
import * as fc from 'fast-check'
import { arbitrary as anyDay } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
import { zone, zoned } from '#libs/testing/date-time.test_arbitrary.ts'
import * as ProductArbitrary from './product.test_arbitrary.ts'
import * as Product from './product.ts'

const validInput = ProductArbitrary.validSnapshot
const product = ProductArbitrary.arbitrary

const DAY = 86_400_000

const day = Schema.decodeSync(Day.Schema)

/** The local time of October 30, 2026, at `hour`:`minute` in the zone named `zone`. */
const onOctober30 = (zone: string, hour: number, minute: number) =>
  DateTime.makeZonedUnsafe({ year: 2026, month: 10, day: 30, hour, minute }, {
    timeZone: zone,
    adjustForTimeZone: true,
  })

/** `millis` from the epoch, in UTC. */
const inUtc = (millis: number) => DateTime.makeZonedUnsafe(millis, { timeZone: 'UTC' })

/** When a product with this expiration date has expired, at `now`'s: at the end of that day in its zone. */
const endOfDay = (expirationDate: Day.Day, now: DateTime.Zoned) => Day.startIn(Day.addDays(expirationDate, 1), now.zone)

/** What a storage gives back after storing `snapshot`. */
const readBack = (snapshot: Product.Snapshot): Product.UnvalidatedSnapshot => ({
  maybeName: Opt.some(snapshot.name),
  maybeCreationDate: Opt.some(snapshot.creationDate),
  maybeExpirationDate: snapshot.maybeExpirationDate,
})

describe('Product snapshots', () => {
  test('a stored product reads back as the same product', () => {
    fc.assert(
      fc.property(product, (p) => Equal.equals(Product.fromSnapshot(readBack(Product.toSnapshot(p))), Opt.some(p))),
    )
  })

  test('a snapshot holds exactly the persistent fields', () => {
    fc.assert(
      fc.property(
        product,
        (p) => Object.keys(Product.toSnapshot(p)).sort().join() === 'creationDate,maybeExpirationDate,name',
      ),
    )
  })

  test('a product needs a creation date', () => {
    fc.assert(
      fc.property(validInput, (input) => Opt.isNone(Product.fromSnapshot({ ...input, maybeCreationDate: Opt.none() }))),
    )
  })

  // The day it was created depends on the zone it was created in, which is not stored.
  test('a stored product is read whatever its expiration day', () => {
    fc.assert(
      fc.property(
        validInput,
        maybe(anyDay),
        (input, maybeExpirationDate) => Opt.isSome(Product.fromSnapshot({ ...input, maybeExpirationDate })),
      ),
    )
  })
})

describe('New products', () => {
  const input = fc.record({ name: fc.string(), creationDate: zoned, maybeExpirationDate: maybe(anyDay) })

  test('a new product is made exactly from a name and an expiration not on a day before its creation, in its zone', () => {
    fc.assert(fc.property(input, (i) =>
      Opt.isSome(Product.make(i)) === (
        Opt.isSome(NormalizedString.fromString(i.name))
        && Opt.match(i.maybeExpirationDate, {
          onNone: () => true,
          onSome: (expiration) => Order.isGreaterThanOrEqualTo(Day.Order)(expiration, Day.fromDateTime(i.creationDate)),
        })
      )))
  })

  test('a new product has the normalized name, and reads back as itself once stored', () => {
    fc.assert(fc.property(input, (i) =>
      Opt.match(Product.make(i), {
        onNone: () => true,
        onSome: (p) =>
          Opt.contains(NormalizedString.fromString(i.name), p.name)
          && Equal.equals(Product.fromSnapshot(readBack(Product.toSnapshot(p))), Opt.some(p)),
      })))
  })

  test('a blank name is not a name, although a stored one is replaced', () => {
    const creationDate = inUtc(0)
    expect(Opt.isNone(Product.make({ name: ' \t ', creationDate, maybeExpirationDate: Opt.none() }))).toBe(true)
    expect(Opt.isSome(Product.fromSnapshot({
      maybeName: Opt.some(' \t '),
      maybeCreationDate: Opt.some(DateTime.toUtc(creationDate)),
      maybeExpirationDate: Opt.none(),
    }))).toBe(true)
  })

  // In UTC, it is already October 31 in New York at 20:30, and still October 29 in Tokyo at 08:30.
  test('a product may expire today in the zone it is created in, far from UTC either way', () => {
    const makeAt = (creationDate: DateTime.Zoned, expiration: string) =>
      Product.make({ name: 'Milk', creationDate, maybeExpirationDate: Opt.some(day(expiration)) })
    expect(Opt.isSome(makeAt(onOctober30('America/New_York', 20, 30), '2026-10-30'))).toBe(true)
    expect(Opt.isNone(makeAt(onOctober30('America/New_York', 20, 30), '2026-10-29'))).toBe(true)
    expect(Opt.isSome(makeAt(onOctober30('Asia/Tokyo', 8, 30), '2026-10-30'))).toBe(true)
    expect(Opt.isNone(makeAt(onOctober30('Asia/Tokyo', 8, 30), '2026-10-29'))).toBe(true)
  })
})

describe('Edited products', () => {
  test('an edited product keeps its creation, takes the normalized name, and expires exactly on a day the edit allows', () => {
    fc.assert(
      fc.property(
        product,
        fc.string(),
        maybe(anyDay),
        zone,
        (p, name, maybeExpirationDate, zone) =>
          Opt.match(Product.edit(p, { name, maybeExpirationDate }, zone), {
            onNone: () =>
              Opt.isNone(NormalizedString.fromString(name))
              || Opt.exists(maybeExpirationDate, (date) => !Product.canBeEditedToExpireOn(p, zone)(date)),
            onSome: (edited) =>
              Equal.equals(edited.creationDate, p.creationDate)
              && Opt.contains(NormalizedString.fromString(name), edited.name)
              && Equal.equals(edited.maybeExpirationDate, maybeExpirationDate),
          }),
      ),
    )
  })

  // Set in a zone further west, the day it expires on may come before its creation's day in the zone of the edit.
  test('an edit allows the day the product expires on already, in every zone, and every day after one it allows', () => {
    fc.assert(fc.property(product, anyDay, fc.nat({ max: 400 }), zone, (p, date, later, zone) => {
      const isAllowed = Product.canBeEditedToExpireOn(p, zone)
      return Opt.match(p.maybeExpirationDate, { onNone: () => true, onSome: isAllowed })
        && (!isAllowed(date) || isAllowed(Day.addDays(date, later)))
    }))
  })
})

describe('Product expiration', () => {
  test('a product has an expiration exactly when it has an expiration date', () => {
    fc.assert(
      fc.property(
        product,
        (p) => Opt.isSome(Product.maybeExpiration(p)) === Opt.isSome(Product.toSnapshot(p).maybeExpirationDate),
      ),
    )
  })

  test('a product has expired exactly when its expiration day is over', () => {
    fc.assert(fc.property(product, zoned, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) =>
          Product.expirationStatus(now)(expiration).hasExpired
            === DateTime.isGreaterThanOrEqualTo(now, endOfDay(expiration.expirationDate, now)),
      })))
  })

  test('the days until the expiration day, or since it, count the midnights between now and it, and freshness is in [0, 1] before it', () => {
    fc.assert(fc.property(product, zoned, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) => {
          const status = Product.expirationStatus(now)(expiration)
          const midnights = Day.daysBetween(Day.fromDateTime(now), expiration.expirationDate)
          if (status.hasExpired) return status.daysSinceExpiration === -midnights && midnights < 0
          return status.daysUntilExpiration === midnights
            && midnights >= 0
            && status.freshness >= 0
            && status.freshness <= 1
        },
      })))
  })

  // Expiring on the third day: the counts change at midnight only, whatever the time of day.
  test('the days until the expiration day are 0 on it and 1 the day before, those since it 1 the day after, and both change at midnight only', () => {
    const expiration = Opt.getOrThrow(Product.maybeExpiration(Opt.getOrThrow(Product.make({
      name: 'Milk',
      creationDate: inUtc(0),
      maybeExpirationDate: Opt.some(day('1970-01-03')),
    }))))
    const daysAt = (ms: number) => {
      const status = Product.expirationStatus(inUtc(ms))(expiration)
      return status.hasExpired ? `${status.daysSinceExpiration} since` : `${status.daysUntilExpiration} until`
    }
    expect(daysAt(0)).toBe('2 until')
    expect(daysAt(DAY - 1)).toBe('2 until')
    expect(daysAt(DAY)).toBe('1 until')
    expect(daysAt(2 * DAY - 1)).toBe('1 until')
    expect(daysAt(2 * DAY)).toBe('0 until')
    expect(daysAt(3 * DAY - 1)).toBe('0 until')
    expect(daysAt(3 * DAY)).toBe('1 since')
    expect(daysAt(4 * DAY - 1)).toBe('1 since')
    expect(daysAt(4 * DAY)).toBe('2 since')
  })

  // Created at the start of a day and expiring that same day: fresh for the whole day.
  test('a product is fully fresh until it is created, and loses freshness linearly afterwards', () => {
    const creation = inUtc(DAY)
    const expiration = Opt.getOrThrow(Product.maybeExpiration(Opt.getOrThrow(Product.make({
      name: 'Milk',
      creationDate: creation,
      maybeExpirationDate: Opt.some(day('1970-01-02')),
    }))))
    const freshnessAt = (ms: number) => {
      const status = Product.expirationStatus(inUtc(ms))(expiration)
      return status.hasExpired ? 0 : status.freshness
    }
    expect(freshnessAt(0)).toBe(1)
    expect(freshnessAt(DAY)).toBe(1)
    expect(freshnessAt(DAY + DAY / 4)).toBe(0.75)
    expect(freshnessAt(DAY + DAY / 2)).toBe(0.5)
    expect(freshnessAt(2 * DAY)).toBe(0)
  })

  // In UTC, it is already October 31 in New York at 20:30, and still October 29 in Tokyo at 08:30 and in Rome at
  // 00:30.
  test('the days are counted in the zone of now, far from UTC either way', () => {
    const expiringOn = (date: string) =>
      Opt.getOrThrow(Product.maybeExpiration(Opt.getOrThrow(Product.fromSnapshot({
        maybeName: Opt.some('Milk'),
        maybeCreationDate: Opt.some(DateTime.makeUnsafe('2026-10-01T00:00:00Z')),
        maybeExpirationDate: Opt.some(day(date)),
      }))))
    const statusAt = (now: DateTime.Zoned, date: string) => {
      const status = Product.expirationStatus(now)(expiringOn(date))
      return status.hasExpired ? `${status.daysSinceExpiration} since` : `${status.daysUntilExpiration} until`
    }
    expect(statusAt(onOctober30('America/New_York', 20, 30), '2026-10-30')).toBe('0 until')
    expect(statusAt(onOctober30('America/New_York', 20, 30), '2026-10-29')).toBe('1 since')
    expect(statusAt(onOctober30('Asia/Tokyo', 8, 30), '2026-10-30')).toBe('0 until')
    expect(statusAt(onOctober30('Asia/Tokyo', 8, 30), '2026-10-29')).toBe('1 since')
    expect(statusAt(onOctober30('Europe/Rome', 0, 30), '2026-10-29')).toBe('1 since')
    expect(statusAt(onOctober30('Europe/Rome', 0, 30), '2026-10-30')).toBe('0 until')
  })
})
