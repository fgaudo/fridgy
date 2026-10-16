import * as DateTime from 'effect/DateTime'
import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { arbitrary as maybe } from '@/libs/option/option.test_arbitrary.ts'
import * as NormalizedString from '@/libs/strings/normalized-string.test_arbitrary.ts'
import * as Product from './product.ts'

const millis = fc.integer({ min: 0, max: 4_102_444_800_000 })
const date = millis.map((ms) => DateTime.makeUnsafe(ms))

/** Anything a storage may give back, valid or not. */
export const unvalidatedSnapshot: fc.Arbitrary<Product.UnvalidatedSnapshot> = fc.record({
  maybeName: maybe(fc.string()),
  maybeCreationDate: maybe(date),
  maybeExpirationDate: maybe(date),
})

// Expirations are an offset from the creation date, so that they are always valid.
/** Snapshots that `fromSnapshot` accepts. */
export const validSnapshot: fc.Arbitrary<Product.UnvalidatedSnapshot> = fc.record({
  name: NormalizedString.arbitrary,
  creation: millis,
  maybeLifetime: maybe(fc.integer({ min: 0, max: 1_000_000_000_000 })),
}).map(({ name, creation, maybeLifetime }) => ({
  maybeName: Opt.some(name),
  maybeCreationDate: Opt.some(DateTime.makeUnsafe(creation)),
  maybeExpirationDate: Opt.map(maybeLifetime, (lifetime) => DateTime.makeUnsafe(creation + lifetime)),
}))

export const arbitrary: fc.Arbitrary<Product.Product> = validSnapshot.map((snapshot) =>
  Opt.getOrThrow(Product.fromSnapshot(snapshot))
)
