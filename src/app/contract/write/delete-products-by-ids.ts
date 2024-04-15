import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds<ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => TaskOption<Error>

export type R_DeleteProductsByIds<ENV, ID> = (
	ids: ReadonlyNonEmptySet<ID>,
) => Reader<ENV, TaskOption<Error>>
