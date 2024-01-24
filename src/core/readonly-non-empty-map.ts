import {
	option as OPT,
	readonlyMap as RoM,
} from 'fp-ts'
import { type Newtype, iso } from 'newtype-ts'

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
): OPT.Option<ReadonlyNonEmptyMap<A, B>> {
	return map.size === 0
		? OPT.none
		: OPT.some(
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
