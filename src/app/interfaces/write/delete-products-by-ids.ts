import type { taskEither as TE } from 'fp-ts'

import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

export type DeleteProductsByIds = (
	ids: ReadonlyNonEmptySet<string>,
) => TE.TaskEither<Error, void>
