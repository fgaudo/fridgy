import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { Process } from '@/app/types/process'

// ==================

export type GetProcesses = TE.TaskEither<
	Error,
	ReadonlySet<Process>
>

export type R_GetProcesses<ENV> =
	RTE.ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<Process>
	>
