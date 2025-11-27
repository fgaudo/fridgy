import * as NonEmptyIterable from 'effect/NonEmptyIterable'

import * as PositiveInteger from './integer/positive.ts'

export interface SizedNonEmptyIterable<A>
	extends NonEmptyIterable.NonEmptyIterable<A> {
	size: PositiveInteger.PositiveInteger
}
