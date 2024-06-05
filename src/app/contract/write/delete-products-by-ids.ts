import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

import type { Base64 } from '@/core/base64'
import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds = (
	ids: ReadonlyNonEmptySet<Base64>,
) => TaskOption<Error>

export type R_DeleteProductsByIds<ENV> = (
	ids: ReadonlyNonEmptySet<Base64>,
) => Reader<ENV, TaskOption<Error>>
