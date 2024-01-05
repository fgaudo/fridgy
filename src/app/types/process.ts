import { ord as Ord } from 'fp-ts'

export interface Processes {
	readonly delete: ReadonlySet<string>
}

export type Process = {
	readonly id: string
	readonly timestamp: number
} & {
	readonly type: 'delete'
	readonly ids: ReadonlySet<string> | string
}

export const processesOrd: Ord.Ord<Process> =
	Ord.fromCompare((a, b) => {
		if (a.timestamp > b.timestamp) return 1

		if (a.timestamp < b.timestamp) return -1

		return 0
	})
