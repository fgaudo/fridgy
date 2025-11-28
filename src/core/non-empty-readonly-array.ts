import * as Arr from 'effect/Array'
import * as Option from 'effect/Option'

export function fromIterable<A>(
	array: ReadonlyArray<A>,
): Option.Option<Arr.NonEmptyReadonlyArray<A>> {
	return Arr.isNonEmptyReadonlyArray(array) ? Option.some(array) : Option.none()
}
