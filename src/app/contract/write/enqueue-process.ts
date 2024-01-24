import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

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
