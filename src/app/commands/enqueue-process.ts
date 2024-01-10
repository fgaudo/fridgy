import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessDTO } from '@/app/types/process'

export type EnqueueProcess = (
	process: Omit<ProcessDTO, 'id' | 'timestamp'>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV> = (
	process: Omit<ProcessDTO, 'id' | 'timestamp'>,
) => RTE.ReaderTaskEither<ENV, Error, void>
