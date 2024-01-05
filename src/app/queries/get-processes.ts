import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither'
import { TaskEither } from 'fp-ts/lib/TaskEither'

import { Process } from '@/app/types/process'

export type GetProcessesWithDeps<ENV> =
	ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<Process>
	>
export type GetProcesses = TaskEither<
	Error,
	ReadonlySet<Process>
>
