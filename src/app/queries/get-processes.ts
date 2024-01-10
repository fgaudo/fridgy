import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessDTO } from '@/app/types/process'

export type GetProcesses = TE.TaskEither<
	Error,
	ReadonlySet<ProcessDTO>
>

export type R_GetProcesses<ENV> =
	RTE.ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<ProcessDTO>
	>
