import {
	type NonEmptyIterable,
	nonEmpty,
} from 'effect/NonEmptyIterable'

import { O } from './imports'

export const fromIterable = <A>(
	iterable: Iterable<A>,
): O.Option<NonEmptyIterable<A>> => {
	const iterator = iterable[Symbol.iterator]()
	const next = iterator.next()
	if (next.done) {
		return O.none()
	}

	return O.some({
		...iterable,
		[nonEmpty]: next.value,
	})
}
