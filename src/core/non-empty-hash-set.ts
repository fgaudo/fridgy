import * as Arbitrary from 'effect/Arbitrary'
import * as Brand from 'effect/Brand'
import * as HashSet from 'effect/HashSet'
import * as _Schema from 'effect/Schema'

import * as PositiveInteger from './integer/positive.ts'

export type NonEmptyHashSet<A> = Brand.Branded<
	HashSet.HashSet<A>,
	`NonEmptyHashSet`
>

/** @internal */
export const _NonEmptyHashSet = <A>() =>
	Brand.refined<NonEmptyHashSet<A>>(
		set => HashSet.size(set) > 0,
		() => Brand.error(`Provided set is empty`),
	)

export const Schema = <Value extends _Schema.Schema.Any>(value: Value) =>
	_Schema
		.fromBrand(_NonEmptyHashSet<Value[`Type`]>())(_Schema.HashSet(value))
		.annotations({
			arbitrary: () => () =>
				Arbitrary.make(_Schema.HashSet(value))
					.filter(set => HashSet.size(set) > 0)
					.map(unsafeFromHashSet),
		})

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PositiveInteger.PositiveInteger =>
	PositiveInteger.unsafeFromNumber(HashSet.size(hashSet))

export const unsafeFromHashSet = <A>(hashSet: HashSet.HashSet<A>) =>
	_NonEmptyHashSet<A>()(hashSet)

export const fromHashSet = <A>(hashSet: HashSet.HashSet<A>) =>
	_NonEmptyHashSet<A>().option(hashSet)
