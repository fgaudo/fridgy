import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessDTO } from '@/app/types/process'

export type GetProcesses<ID> = TE.TaskEither<
	Error,
	ReadonlySet<ProcessDTO<ID>>
>

export type R_GetProcesses<ENV, ID> =
	RTE.ReaderTaskEither<
		ENV,
		Error,
		ReadonlySet<ProcessDTO<ID>>
	>
