import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessInputDTO } from '@/app/types/process'

export type EnqueueProcess<ID> = (
	process: ProcessInputDTO<ID>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV, ID> = (
	process: ProcessInputDTO<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
