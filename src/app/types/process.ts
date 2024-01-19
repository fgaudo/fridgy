import * as Eq from 'fp-ts/Eq'
import * as Ord from 'fp-ts/Ord'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

interface Action<ID> {
	type: 'delete'
	ids: ReadonlyNonEmptySet<ID>
}

export type ProcessDTO<ID> = {
	id: ID
	timestamp: number
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
