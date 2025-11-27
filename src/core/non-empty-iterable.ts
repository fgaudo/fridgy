import * as Func from 'effect/Function'
import * as Iterable from 'effect/Iterable'
import * as NonEmptyIterable from 'effect/NonEmptyIterable'
import * as Option from 'effect/Option'

export function fromIterable<A>(
	iterable: Iterable<A>,
): Option.Option<NonEmptyIterable.NonEmptyIterable<A>> {
	const iterator = Iterator.from(iterable)

	const first = iterator.next()

	if (first.done) {
		return Option.none()
	}

	return Option.some({
		[NonEmptyIterable.nonEmpty]: first.value,
		[Symbol.iterator]: () => Iterator.from(iterable),
	})
}

export function make<A>(
	...values: [A, ...A[]]
): NonEmptyIterable.NonEmptyIterable<A> {
	return {
		[NonEmptyIterable.nonEmpty]: values[0],
		[Symbol.iterator]: () => Iterator.from(values),
	}
}

const map_ =
	<A, B>(mapper: (a: A) => B) =>
	(
		iterable: NonEmptyIterable.NonEmptyIterable<A>,
	): NonEmptyIterable.NonEmptyIterable<B> => {
		const it = Iterable.map(iterable, mapper)
		return {
			[NonEmptyIterable.nonEmpty]: mapper(iterable[NonEmptyIterable.nonEmpty]),
			[Symbol.iterator]: () => Iterator.from(it),
		}
	}

export const map = Func.dual<
	<A, B>(
		mapper: (a: A) => B,
	) => (
		iterable: NonEmptyIterable.NonEmptyIterable<A>,
	) => NonEmptyIterable.NonEmptyIterable<B>,
	<A, B>(
		iterable: NonEmptyIterable.NonEmptyIterable<A>,
		mapper: (a: A) => B,
	) => NonEmptyIterable.NonEmptyIterable<B>
>(2, (iterable, mapper) => {
	return map_(mapper)(iterable)
})
