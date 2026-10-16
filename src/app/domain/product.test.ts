import { describe, expect, test } from 'bun:test'
import * as DateTime from 'effect/DateTime'
import * as Duration from 'effect/Duration'
import * as Equal from 'effect/Equal'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as ProductArbitrary from './product.test-arbitrary.ts'
import * as Product from './product.ts'

const date = fc.integer({ min: 0, max: 4_102_444_800_000 }).map((ms) => DateTime.makeUnsafe(ms))
const validInput = ProductArbitrary.validSnapshot
const product = ProductArbitrary.arbitrary

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

  test('a product cannot expire before it is created', () => {
    fc.assert(fc.property(validInput, fc.integer({ min: 1, max: 1_000_000 }), (input, early) => {
      const creation = Opt.getOrThrow(input.maybeCreationDate)
      const expiration = DateTime.makeUnsafe(DateTime.toEpochMillis(creation) - early)
      return Opt.isNone(Product.fromSnapshot({ ...input, maybeExpirationDate: Opt.some(expiration) }))
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

  test('a product has expired exactly when its expiration date is not in the future', () => {
    fc.assert(fc.property(product, date, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) =>
          Product.expirationStatus(now)(expiration).hasExpired
            === DateTime.isGreaterThanOrEqualTo(now, Product.expirationDate(expiration)),
      })))
  })

  test('before expiring, the time left reaches the expiration and freshness is a ratio in [0, 1]', () => {
    fc.assert(fc.property(product, date, (p, now) =>
      Opt.match(Product.maybeExpiration(p), {
        onNone: () => true,
        onSome: (expiration) => {
          const status = Product.expirationStatus(now)(expiration)
          if (status.hasExpired) return true
          const expirationDate = Product.expirationDate(expiration)
          return Duration.toMillis(status.timeLeft)
              === DateTime.toEpochMillis(expirationDate) - DateTime.toEpochMillis(now)
            && status.freshness >= 0
            && status.freshness <= 1
        },
      })))
  })

  test('a product is fully fresh until it is created, and loses freshness linearly afterwards', () => {
    const creation = DateTime.makeUnsafe(1_000)
    const expiration = Opt.getOrThrow(Product.maybeExpiration(Opt.getOrThrow(Product.fromSnapshot({
      maybeName: Opt.some('Milk'),
      maybeCreationDate: Opt.some(creation),
      maybeExpirationDate: Opt.some(DateTime.makeUnsafe(5_000)),
    }))))
    const freshnessAt = (ms: number) => {
      const status = Product.expirationStatus(DateTime.makeUnsafe(ms))(expiration)
      return status.hasExpired ? 0 : status.freshness
    }
    expect(freshnessAt(0)).toBe(1)
    expect(freshnessAt(1_000)).toBe(1)
    expect(freshnessAt(2_000)).toBe(0.75)
    expect(freshnessAt(3_000)).toBe(0.5)
    expect(freshnessAt(5_000)).toBe(0)
  })
})
