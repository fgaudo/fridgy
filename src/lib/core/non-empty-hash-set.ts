import { B, HS, PInt } from './imports.ts'

export type NonEmptyHashSet<A> = B.Branded<
	HS.HashSet<A>,
	'NonEmptyHashSet'
>

/** @internal */
export const NonEmptyHashSet = <A>() =>
	B.refined<NonEmptyHashSet<A>>(
		set => HS.size(set) > 0,
		() => B.error('Provided set is empty'),
	)

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PInt.PositiveInteger =>
	PInt.unsafeMake(HS.size(hashSet))

export const unsafeMake = <A>(
	hashSet: HS.HashSet<A>,
) => NonEmptyHashSet<A>()(hashSet)

export const make = <A>(hashSet: HS.HashSet<A>) =>
	NonEmptyHashSet<A>().option(hashSet)
