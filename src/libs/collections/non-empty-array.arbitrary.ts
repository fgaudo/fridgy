import type * as Arr from 'effect/Array'
import * as fc from 'fast-check'

/** Generates non-empty arrays of at most `maxLength` items. */
export const arbitrary = <A>(
  item: fc.Arbitrary<A>,
  { maxLength = 8 }: { readonly maxLength?: number } = {},
): fc.Arbitrary<Arr.NonEmptyArray<A>> =>
  fc.tuple(item, fc.array(item, { maxLength: Math.max(maxLength - 1, 0) })).map((
    [head, tail],
  ): Arr.NonEmptyArray<A> => [head, ...tail])
