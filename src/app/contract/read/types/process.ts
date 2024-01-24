import type { Ordering } from 'fp-ts/Ordering'

import type { ProcessInputDTO } from '@/app/contract/write/enqueue-process'

export type ProcessDTO<ID> = {
	id: ID
	timestamp: number
} & ProcessInputDTO<ID>

export const processesCompare: <ID>(
	a: ProcessDTO<ID>,
	b: ProcessDTO<ID>,
) => Ordering = (a, b) => {
	if (a.timestamp > b.timestamp) return 1

	if (a.timestamp < b.timestamp) return -1

	return 0
}

export const processesEquals: <ID>(
	a: ProcessDTO<ID>,
	b: ProcessDTO<ID>,
) => boolean = (a, b) => a.id === b.id
