import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export interface ProcessInputDTO<ID> {
	type: 'delete'
	ids: ReadonlyNonEmptySet<ID>
}

export type EnqueueProcess<ID> = (
	process: ProcessInputDTO<ID>,
) => TE.TaskEither<Error, void>

export type R_EnqueueProcess<ENV, ID> = (
	process: ProcessInputDTO<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
