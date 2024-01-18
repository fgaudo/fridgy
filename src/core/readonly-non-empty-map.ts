import { Option, none, some } from 'fp-ts/Option'
import * as RoM from 'fp-ts/ReadonlyMap'
import { Newtype, iso } from 'newtype-ts'

export type ReadonlyNonEmptyMap<A, B> = Newtype<
	{ readonly ReadonlyNonEmptyMap: unique symbol },
	ReadonlyMap<A, B>
>

export function singleton<A, B>(
	a: A,
	b: B,
): ReadonlyNonEmptyMap<A, B> {
	return iso<ReadonlyNonEmptyMap<A, B>>().wrap(
		RoM.singleton(a, b),
	)
}

export function fromMap<A, B>(
	map: ReadonlyMap<A, B>,
): Option<ReadonlyNonEmptyMap<A, B>> {
	return map.size === 0
		? none
		: some(
				iso<ReadonlyNonEmptyMap<A, B>>().wrap(
					map,
				),
			)
}

export function toReadonlyMap<A, B>(
	set: ReadonlyNonEmptyMap<A, B>,
): ReadonlyMap<A, B> {
	return iso<ReadonlyNonEmptyMap<A, B>>().unwrap(
		set,
	)
}
