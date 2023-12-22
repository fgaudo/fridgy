import * as R from 'fp-ts/Reader'
import * as TE from 'fp-ts/TaskEither'

import { DeleteFoodsByIdsWithDeps } from '@/application/commands/delete-foods-by-ids'

export const deleteFoodsByIds: DeleteFoodsByIdsWithDeps<unknown> = () =>
	R.of(TE.right(undefined))
