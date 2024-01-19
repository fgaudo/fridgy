import type { Eq } from 'fp-ts/Eq'
import * as OPT from 'fp-ts/Option'
import type { Ord } from 'fp-ts/Ord'
import * as RoNeA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RoS from 'fp-ts/ReadonlySet'
import { pipe } from 'fp-ts/function'
import { type Newtype, iso } from 'newtype-ts'

export type ReadonlyNonEmptySet<A> = Newtype<
	{ readonly ReadonlyNonEmptySet: unique symbol },
	ReadonlySet<A>
>

export function singleton<A>(
	a: A,
): ReadonlyNonEmptySet<A> {
	return iso<ReadonlyNonEmptySet<A>>().wrap(
		RoS.singleton(a),
	)
}

export function fromValues<A>(
	eq: Eq<A>,
): (
	...a: RoNeA.ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptySet<A> {
	const f = iso<ReadonlyNonEmptySet<A>>()
	return (...values) => {
		return f.wrap(
			RoS.fromReadonlyArray(eq)(values),
		)
	}
}

export function fromSet<A>(
	set: ReadonlySet<A>,
): OPT.Option<ReadonlyNonEmptySet<A>> {
	return set.size === 0
		? OPT.none
		: OPT.some(
				iso<ReadonlyNonEmptySet<A>>().wrap(set),
			)
}

export function toReadonlySet<A>(
	set: ReadonlyNonEmptySet<A>,
): ReadonlySet<A> {
	return iso<ReadonlyNonEmptySet<A>>().unwrap(set)
}

export function toReadonlyNonEmptyArray<A>(
	ord: Ord<A>,
): (
	set: ReadonlyNonEmptySet<A>,
) => RoNeA.ReadonlyNonEmptyArray<A> {
	const f = iso<ReadonlyNonEmptySet<A>>()
	return set =>
		pipe(
			f.unwrap(set),
			RoS.toReadonlyArray(ord),
		) as RoNeA.ReadonlyNonEmptyArray<A>
}
