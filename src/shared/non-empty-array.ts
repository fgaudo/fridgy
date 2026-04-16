import * as Arr from 'effect/Array'
import * as Option from 'effect/Option'

import * as PositiveInteger from '@/shared/integer/positive-integer.ts'

export function fromIterable<A>(
	array: ReadonlyArray<A>,
): Option.Option<Arr.NonEmptyReadonlyArray<A>> {
	return Arr.isReadonlyArrayNonEmpty(array) ? Option.some(array) : Option.none()
}

export function length<A>(array: Arr.NonEmptyArray<A>) {
	return PositiveInteger.fromNumberUnsafe(array.length)
}
