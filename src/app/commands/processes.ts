import { ReaderObservable } from 'fp-ts-rxjs/lib/ReaderObservable'
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'
import { TaskEither } from 'fp-ts/lib/TaskEither'
import { Observable } from 'rxjs'

export interface Processes {
	readonly delete: ReadonlySet<string>
}

export type Process = { readonly id: string } & {
	readonly type: 'delete'
	readonly ids: ReadonlySet<string> | string
}

export type OnProcessWithDeps<ENV> = ReaderObservable<ENV, Process>
export type OnProcess = Observable<Process>

export type OnProcessesWithDeps<ENV> = ReaderObservable<ENV, Processes>
export type OnProcesses = Observable<Processes>

export type AddProcess = (
	process: Omit<Process, 'id'>
) => TaskEither<Error, void>
export type AddProcessWithDeps<ENV> = (
	process: Omit<Process, 'id'>
) => ReaderTaskEither<ENV, Error, void>

export type RemoveProcess = (id: Process['id']) => TaskEither<Error, void>
export type RemoveProcessWithDeps<ENV> = (
	id: Process['id']
) => ReaderTaskEither<ENV, Error, void>
