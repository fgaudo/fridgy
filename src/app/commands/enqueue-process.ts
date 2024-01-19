import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import type { ProcessInputDTO } from '@/app/types/process'

export type EnqueueProcess<ID> = (
	process: ProcessInputDTO<ID>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV, ID> = (
	process: ProcessInputDTO<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
