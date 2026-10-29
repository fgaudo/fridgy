import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as day } from '#libs/dates/day.test_arbitrary.ts'
import * as Day from '#libs/dates/day.ts'
import { arbitrary as maybe } from '#libs/option/option.test_arbitrary.ts'
import * as NormalizedString from '#libs/strings/normalized-string.test_arbitrary.ts'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import * as Product from './product.ts'

const DAY = 86_400_000

/** Anything a storage may give back, valid or not. */
export const unvalidatedSnapshot: fc.Arbitrary<Product.UnvalidatedSnapshot> = fc.record({
  maybeName: maybe(fc.string()),
  maybeCreationDate: maybe(utc),
  maybeExpirationDate: maybe(day),
})

// Expirations are an offset from the creation date, as a product is made: from the day before it in UTC, which
// is the day of its creation in a zone west of UTC, to about thirty years later.
/** Snapshots that `fromSnapshot` accepts. */
export const validSnapshot: fc.Arbitrary<Product.UnvalidatedSnapshot> = fc.record({
  name: NormalizedString.arbitrary,
  creation: fc.integer({ min: DAY, max: 4_102_444_800_000 }),
  maybeLifetime: maybe(fc.integer({ min: -DAY, max: 1_000_000_000_000 })),
}).map(({ name, creation, maybeLifetime }) => ({
  maybeName: Opt.some(name),
  maybeCreationDate: Opt.some(DateTime.makeUnsafe(creation)),
  maybeExpirationDate: Opt.map(maybeLifetime, (lifetime) => Day.fromDateTime(DateTime.makeUnsafe(creation + lifetime))),
}))

export const arbitrary: fc.Arbitrary<Product.Product> = validSnapshot.map((snapshot) =>
  Opt.getOrThrow(Product.fromSnapshot(snapshot))
)
