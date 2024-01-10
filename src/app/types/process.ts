import { eq as Eq, ord as Ord } from 'fp-ts'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export interface Processes {
	readonly delete: ReadonlySet<string>
}

export type ProcessDTO = {
	readonly id: string
	readonly timestamp: number
} & {
	readonly type: 'delete'
	readonly ids: ReadonlyNonEmptySet<string>
}

export const processesOrd: Ord.Ord<ProcessDTO> =
	Ord.fromCompare((a, b) => {
		if (a.timestamp > b.timestamp) return 1

		if (a.timestamp < b.timestamp) return -1

		return 0
	})

export const processesEq: Eq.Eq<ProcessDTO> =
	Eq.fromEquals((a, b) => a.id === b.id)
