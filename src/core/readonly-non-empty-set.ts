import {
	type eq as Eq,
	function as F,
	option as OPT,
	type ord as Ord,
	predicate as P,
	readonlyNonEmptyArray as RoNeA,
	readonlySet as RoS,
} from 'fp-ts'
import { type Newtype, iso } from 'newtype-ts'

const identity = F.identity
const pipe = F.pipe
const flow = F.flow

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

export const map = <B>(eq: Eq.Eq<B>) => {
	const j = iso<ReadonlyNonEmptySet<B>>()
	return <A>(
		f: (a: A) => B,
	): ((
		a: ReadonlyNonEmptySet<A>,
	) => ReadonlyNonEmptySet<B>) => {
		const i = iso<ReadonlyNonEmptySet<A>>()
		return flow(i.unwrap, RoS.map(eq)(f), j.wrap)
	}
}

export function fromValues<A>(
	eq: Eq.Eq<A>,
): (
	...a: RoNeA.ReadonlyNonEmptyArray<A>
) => ReadonlyNonEmptySet<A> {
	const f = iso<ReadonlyNonEmptySet<A>>()
	return (...values) =>
		pipe(
			RoS.fromReadonlyArray(eq)(values),
			f.wrap,
		)
}

export function fromSet<A>(
	set: ReadonlySet<A>,
): OPT.Option<ReadonlyNonEmptySet<A>> {
	return pipe(
		set,
		OPT.fromPredicate(pipe(RoS.isEmpty, P.not)),
		OPT.map(iso<ReadonlyNonEmptySet<A>>().wrap),
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
	return flow(
		f.unwrap,
		RoS.toReadonlyArray(ord),
		RoNeA.fromReadonlyArray,
		OPT.match(() => {
			throw new Error('Array should be non-empty')
		}, identity),
	)
}
