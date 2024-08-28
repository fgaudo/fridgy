import {
	type NonEmptyIterable,
	nonEmpty,
} from 'effect/NonEmptyIterable'

import { HS, O } from './imports'
import {
	type PositiveInteger,
	unsafe_fromNumber,
} from './integer/positive'

export type NonEmptyHashSet<A> = HS.HashSet<A> &
	NonEmptyIterable<A>

export const size = <A>(
	hashSet: NonEmptyHashSet<A>,
): PositiveInteger =>
	unsafe_fromNumber(HS.size(hashSet))

export const fromHashSet = <A>(
	hashSet: HS.HashSet<A>,
): O.Option<NonEmptyHashSet<A>> => {
	const next = hashSet[Symbol.iterator]().next()

	if (next.done) {
		return O.none()
	}

	return O.some({
		...hashSet,
		[nonEmpty]: next.value,
	})
}
