import * as HashSet from 'effect/HashSet'
import * as fc from 'fast-check'
import * as NonEmptyHashSet from './non-empty-hash-set.ts'

export const arbitrary = <A>(
  item: fc.Arbitrary<A>,
  { maxLength = 8 }: { readonly maxLength?: number } = {},
): fc.Arbitrary<NonEmptyHashSet.NonEmptyHashSet<A>> =>
  fc.array(item, { minLength: 1, maxLength }).map((items) => NonEmptyHashSet.makeUnsafe(HashSet.fromIterable(items)))
