import { reader as R, taskEither as TE } from 'fp-ts'

import { DeleteFoodsByIdsWithDeps } from '@/app/commands/delete-foods-by-ids'

export const deleteFoodsByIds: DeleteFoodsByIdsWithDeps<unknown> = () =>
	R.of(TE.right(undefined))
