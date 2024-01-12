import { eq as Eq, ord as Ord } from 'fp-ts'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

interface Action<ID> {
	readonly type: 'delete'
	readonly ids: ReadonlyNonEmptySet<ID>
}

export type ProcessDTO<ID> = {
	readonly id: ID
	readonly timestamp: number
} & Action<ID>

export type ProcessInputDTO<FOOD_ID> =
	Action<FOOD_ID>

export function createProcessesOrd<ID>(): Ord.Ord<
	ProcessDTO<ID>
> {
	return Ord.fromCompare((a, b) => {
		if (a.timestamp > b.timestamp) return 1

		if (a.timestamp < b.timestamp) return -1

		return 0
	})
}

export function processesEq<ID>(): Eq.Eq<
	ProcessDTO<ID>
> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}
