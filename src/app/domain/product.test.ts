import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import * as ProductArbitrary from './product.test_arbitrary.ts'
import * as Product from './product.ts'

const date = utc
const validInput = ProductArbitrary.validSnapshot
const product = ProductArbitrary.arbitrary

const DAY = 86_400_000

/** When a product with this expiration date has expired: at the end of that day. */
const endOfDay = (expirationDate: DateTime.Utc) => DateTime.add(DateTime.startOf(expirationDate, 'day'), { days: 1 })

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

  test('a product cannot expire on a day before the one it is created', () => {
    fc.assert(fc.property(validInput, fc.integer({ min: 1, max: 1_000_000_000 }), (input, early) => {
      const creation = Opt.getOrThrow(input.maybeCreationDate)
      const expiration = DateTime.subtract(DateTime.startOf(creation, 'day'), { milliseconds: early })
      return Opt.isNone(Product.fromSnapshot({ ...input, maybeExpirationDate: Opt.some(expiration) }))
    }))
  })

  test('a product may expire on the day it is created, at any time of that day', () => {
    fc.assert(fc.property(validInput, fc.integer({ min: 0, max: DAY - 1 }), (input, time) => {
      const creation = Opt.getOrThrow(input.maybeCreationDate)
      const expiration = DateTime.add(DateTime.startOf(creation, 'day'), { milliseconds: time })
      return Opt.isSome(Product.fromSnapshot({ ...input, maybeExpirationDate: Opt.some(expiration) }))
    }))
  })
})

describe('New products', () => {
  const input = fc.record({ name: fc.string(), creationDate: date, maybeExpirationDate: maybe(date) })

  test('a new product is made exactly from a name and an expiration not on a day before its creation', () => {
    fc.assert(fc.property(input, (i) =>
      Opt.isSome(Product.make(i)) === (
        Opt.isSome(NormalizedString.fromString(i.name))
        && Opt.match(i.maybeExpirationDate, {
          onNone: () => true,
          onSome: (expiration) => !DateTime.isLessThan(expiration, DateTime.startOf(i.creationDate, 'day')),
        })
      )))
  })

  test('a new product has the normalized name, and reads back as itself once stored', () => {
    fc.assert(fc.property(input, (i) =>
      Opt.match(Product.make(i), {
        onNone: () => true,
        onSome: (p) =>
          Opt.contains(NormalizedString.fromString(i.name), Product.name(p))
          && Equal.equals(Product.fromSnapshot(readBack(Product.toSnapshot(p))), Opt.some(p)),
      })))
  })

  test('a blank name is not a name, although a stored one is replaced', () => {
    const creationDate = DateTime.makeUnsafe(0)
    expect(Opt.isNone(Product.make({ name: ' \t ', creationDate, maybeExpirationDate: Opt.none() }))).toBe(true)
    expect(Opt.isSome(Product.fromSnapshot({
      maybeName: Opt.some(' \t '),
      maybeCreationDate: Opt.some(creationDate),
      maybeExpirationDate: Opt.none(),
    }))).toBe(true)
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
    fc.assert(fc.property(product, date, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) =>
          Product.expirationStatus(now)(expiration).hasExpired
            === DateTime.isGreaterThanOrEqualTo(now, endOfDay(Product.expirationDate(expiration))),
      })))
  })

  test('before expiring, the time left reaches the end of the expiration day and freshness is in [0, 1]', () => {
    fc.assert(fc.property(product, date, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) => {
          const status = Product.expirationStatus(now)(expiration)
          if (status.hasExpired) return true
          const end = endOfDay(Product.expirationDate(expiration))
          return Duration.toMillis(status.timeLeft) === DateTime.toEpochMillis(end) - DateTime.toEpochMillis(now)
            && status.freshness >= 0
            && status.freshness <= 1
        },
      })))
  })

  // Created at the start of a day and expiring that same day: fresh for the whole day.
  test('a product is fully fresh until it is created, and loses freshness linearly afterwards', () => {
    const creation = DateTime.makeUnsafe(DAY)
    const expiration = Opt.getOrThrow(Product.maybeExpiration(Opt.getOrThrow(Product.make({
      name: 'Milk',
      creationDate: creation,
      maybeExpirationDate: Opt.some(DateTime.makeUnsafe(DAY + 1_000)),
    }))))
    const freshnessAt = (ms: number) => {
      const status = Product.expirationStatus(DateTime.makeUnsafe(ms))(expiration)
      return status.hasExpired ? 0 : status.freshness
    }
    expect(freshnessAt(0)).toBe(1)
    expect(freshnessAt(DAY)).toBe(1)
    expect(freshnessAt(DAY + DAY / 4)).toBe(0.75)
    expect(freshnessAt(DAY + DAY / 2)).toBe(0.5)
    expect(freshnessAt(2 * DAY)).toBe(0)
  })
})
