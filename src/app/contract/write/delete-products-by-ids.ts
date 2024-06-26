import type {
	reader as R,
	taskOption as TO,
} from 'fp-ts'

import type { Base64 } from '@/core/base64'
import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds = (
	ids: ReadonlyNonEmptySet<Base64>,
) => TO.TaskOption<Error>

export type R_DeleteProductsByIds<ENV> = (
	ids: ReadonlyNonEmptySet<Base64>,
) => R.Reader<ENV, TO.TaskOption<Error>>
