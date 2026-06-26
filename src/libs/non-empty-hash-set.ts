import * as Brand from 'effect/Brand'
import * as HashSet from 'effect/HashSet'

import * as PositiveInteger from '@/libs/integer/positive-integer.ts'

export type NonEmptyHashSet<A> = Brand.Branded<
  HashSet.HashSet<A>,
  'core.NonEmptyHashSet'
>

const NonEmptyHashSet = <A>() => Brand.make<NonEmptyHashSet<A>>((set) => HashSet.size(set) > 0)

export const size = <A>(
  hashSet: NonEmptyHashSet<A>,
): PositiveInteger.PositiveInteger => PositiveInteger.fromNumberUnsafe(HashSet.size(hashSet))

export const makeUnsafe = <A>(hashSet: HashSet.HashSet<A>) => NonEmptyHashSet<A>()(hashSet)

export const make = <A>(hashSet: HashSet.HashSet<A>) => NonEmptyHashSet<A>().option(hashSet)

/** @internal */
export const _internal = {
  NonEmptyHashSet,
}
