import * as Brand from 'effect/Brand'
import * as HashSet from 'effect/HashSet'
import * as _Schema from 'effect/Schema'

import * as PositiveInteger from './integer/positive.ts'

export type NonEmptyHashSet<A> = Brand.Branded<
	HashSet.HashSet<A>,
	'core.NonEmptyHashSet'
>

/** @internal */
export const _NonEmptyHashSet = <A>() =>
	Brand.make<NonEmptyHashSet<A>>(set => HashSet.size(set) > 0)

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PositiveInteger.PositiveInteger =>
	PositiveInteger.unsafeFromNumber(HashSet.size(hashSet))

export const makeUnsafe = <A>(hashSet: HashSet.HashSet<A>) =>
	_NonEmptyHashSet<A>()(hashSet)

export const make = <A>(hashSet: HashSet.HashSet<A>) =>
	_NonEmptyHashSet<A>().option(hashSet)
