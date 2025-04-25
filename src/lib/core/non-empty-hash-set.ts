import { HS, O, PInt } from './imports.ts'

const _: unique symbol = Symbol()

export type NonEmptyHashSet<A> = HS.HashSet<A> & {
	[_]: true
}

export function isNonEmptyHashSet<A>(
	hs: HS.HashSet<A>,
): hs is NonEmptyHashSet<A> {
	return HS.size(hs) > 0
}

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PInt.PositiveInteger =>
	PInt.unsafe_fromNumber(HS.size(hashSet))

export const unsafe_fromHashSet = <A>(
	hashSet: HS.HashSet<A>,
) => {
	if (!isNonEmptyHashSet(hashSet)) {
		throw new Error('Not a non-empty hashSet')
	}

	return hashSet
}

export const fromHashSet = O.liftThrowable(
	<A>(value: HS.HashSet<A>) =>
		unsafe_fromHashSet(value),
)
