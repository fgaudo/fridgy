import { ReaderObservable } from 'fp-ts-rxjs/lib/ReaderObservable'
import { Ord, fromCompare } from 'fp-ts/lib/Ord'
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'
import { TaskEither } from 'fp-ts/lib/TaskEither'
import { Observable } from 'rxjs'

export interface Processes {
	readonly delete: ReadonlySet<string>
}

export type Process = { readonly id: string; readonly timestamp: number } & {
	readonly type: 'delete'
	readonly ids: ReadonlySet<string> | string
}

export type OnChangeProcessesWithDeps<ENV> = ReaderObservable<ENV, Processes>
export type OnChangeProcesses = Observable<Processes>

export type GetProcessesWithDeps<ENV> = ReaderTaskEither<
	ENV,
	Error,
	ReadonlySet<Process>
>
export type GetProcesses = TaskEither<Error, ReadonlySet<Process>>

export type EnqueueProcess = (
	process: Omit<Process, 'id' | 'timestamp'>
) => TaskEither<Error, void>
export type EnqueueProcessWithDeps<ENV> = (
	process: Omit<Process, 'id' | 'timestamp'>
) => ReaderTaskEither<ENV, Error, void>

export type RemoveProcess = (id: Process['id']) => TaskEither<Error, void>
export type RemoveProcessWithDeps<ENV> = (
	id: Process['id']
) => ReaderTaskEither<ENV, Error, void>

export const processesOrd: Ord<Process> = fromCompare((a, b) => {
	if (a.timestamp > b.timestamp) return 1

	if (a.timestamp < b.timestamp) return -1

	return 0
})
