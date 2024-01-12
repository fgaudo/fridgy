import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteFoodsByIds<ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => TE.TaskEither<Error, void>

export type R_DeleteFoodsByIds<ENV, ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
