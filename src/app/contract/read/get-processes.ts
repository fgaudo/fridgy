import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import type { ProcessDTO } from '@/app/contract/read/types/process'

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
