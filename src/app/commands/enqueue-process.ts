import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ProcessInputDTO } from '@/app/types/process'

export type EnqueueProcess<FOOD_ID> = (
	process: ProcessInputDTO<FOOD_ID>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV, FOOD_ID> = (
	process: ProcessInputDTO<FOOD_ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
