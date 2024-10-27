import { B, HS, O, PInt } from './imports.js'

const _: unique symbol = Symbol()

export type NonEmptyHashSet<A> = HS.HashSet<A> &
	B.Brand<typeof _>

export const isNonEmptyHashSet = (
	hs: HS.HashSet<unknown>,
) => HS.size(hs) > 0

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PInt.PositiveInteger =>
	PInt.unsafe_fromNumber(HS.size(hashSet))

export const unsafe_fromHashSet = <A>(
	hashSet: HS.HashSet<A>,
) =>
	B.refined<NonEmptyHashSet<A>>(
		value => isNonEmptyHashSet(value),
		() => B.error('Hashset is empty'),
	)(hashSet)

export const fromHashSet = O.liftThrowable(
	<A>(value: HS.HashSet<A>) =>
		unsafe_fromHashSet(value),
)
