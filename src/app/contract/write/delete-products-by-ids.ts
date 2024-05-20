import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

import type { Id } from '@/core/id'
import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds = (
	ids: ReadonlyNonEmptySet<Id>,
) => TaskOption<Error>

export type R_DeleteProductsByIds<ENV> = (
	ids: ReadonlyNonEmptySet<Id>,
) => Reader<ENV, TaskOption<Error>>
