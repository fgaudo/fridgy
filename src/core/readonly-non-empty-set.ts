import {
	type eq as Eq,
	function as F,
	option as OPT,
	type ord as Ord,
	readonlyNonEmptyArray as RoNeA,
	readonlySet as RoS,
} from 'fp-ts'
import { type Newtype, iso } from 'newtype-ts'

const pipe = F.pipe

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
	eq: Eq.Eq<A>,
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
	ord: Ord.Ord<A>,
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
