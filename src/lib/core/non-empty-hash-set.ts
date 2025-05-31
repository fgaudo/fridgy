import { Arbitrary } from 'effect'

import { B, HS, NEHS, PInt, Sc } from './imports.ts'

export type NonEmptyHashSet<A> = B.Branded<HS.HashSet<A>, `NonEmptyHashSet`>

/** @internal */
export const NonEmptyHashSet = <A>() =>
	B.refined<NonEmptyHashSet<A>>(
		set => HS.size(set) > 0,
		() => B.error(`Provided set is empty`),
	)

export const NonEmptyHashSetSchema = <Value extends Sc.Schema.Any>(
	value: Value,
) =>
	Sc.fromBrand(NonEmptyHashSet<Value[`Type`]>())(Sc.HashSet(value)).annotations(
		{
			arbitrary: () => () =>
				Arbitrary.make(Sc.HashSet(value))
					.filter(set => HS.size(set) > 0)
					.map(NEHS.unsafeFromHashSet),
		},
	)

export const size = <A>(hashSet: NonEmptyHashSet<A>): PInt.PositiveInteger =>
	PInt.unsafeFromNumber(HS.size(hashSet))

export const unsafeFromHashSet = <A>(hashSet: HS.HashSet<A>) =>
	NonEmptyHashSet<A>()(hashSet)

export const fromHashSet = <A>(hashSet: HS.HashSet<A>) =>
	NonEmptyHashSet<A>().option(hashSet)
