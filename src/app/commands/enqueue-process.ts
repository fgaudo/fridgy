import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'
import { TaskEither } from 'fp-ts/lib/TaskEither'
import { Process } from '@/app/types/process'

export type EnqueueProcess = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => TaskEither<Error, void>

export type EnqueueProcessWithDeps<ENV> = (
	process: Omit<Process, 'id' | 'timestamp'>,
) => ReaderTaskEither<ENV, Error, void>
