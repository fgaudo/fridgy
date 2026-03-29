import * as Arr from 'effect/Array'
import * as Option from 'effect/Option'

import * as PositiveInteger from '@/core/integer/positive-integer.ts'

export function fromIterable<A>(
	array: readonly A[],
): Option.Option<Arr.NonEmptyReadonlyArray<A>> {
	return Arr.isReadonlyArrayNonEmpty(array) ? Option.some(array) : Option.none()
}

export function length<A>(array: Arr.NonEmptyArray<A>) {
	return PositiveInteger.unsafeFromNumber(array.length)
}
