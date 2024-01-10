import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteFoodsByIds = (
	ids: ReadonlyNonEmptySet<string>,
) => TE.TaskEither<Error, void>

export type R_DeleteFoodsByIds<ENV> = (
	ids: ReadonlyNonEmptySet<string>,
) => RTE.ReaderTaskEither<ENV, Error, void>
