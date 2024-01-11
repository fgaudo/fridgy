import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessDTO } from '@/app/types/process'

export type EnqueueProcess = (
	process: ProcessDTO,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV> = (
	process: ProcessDTO,
) => RTE.ReaderTaskEither<ENV, Error, void>
