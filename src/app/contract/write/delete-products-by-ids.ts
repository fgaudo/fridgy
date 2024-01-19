import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds<ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => TE.TaskEither<Error, void>

export type R_DeleteProductsByIds<ENV, ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
