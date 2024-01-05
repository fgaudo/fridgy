import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'
import { TaskEither } from 'fp-ts/lib/TaskEither'

import { Process } from '@/app/types/process'

export type RemoveProcess = (
	id: Process['id'],
) => TaskEither<Error, void>

export type RemoveProcessWithDeps<ENV> = (
	id: Process['id'],
) => ReaderTaskEither<ENV, Error, void>
