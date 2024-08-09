import { Effect as Eff, Effect } from 'effect'
import * as HS from 'effect/HashSet'

import { DeleteProductsByIdsService } from '../interfaces/write/delete-products-by-ids'

export type DeleteProductsByIds = (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	string,
	DeleteProductsByIdsService
>

export const command: DeleteProductsByIds = ids =>
	Effect.gen(function* () {
		const deleteProductsByIds =
			yield* DeleteProductsByIdsService

		if (HS.size(ids) <= 0) {
			yield* Effect.fail('No ids provided')
		}

		yield* Effect.logDebug(
			'About to delete products',
		).pipe(Effect.annotateLogs('ids', ids))

		yield* deleteProductsByIds(ids)

		yield* Effect.logDebug(
			'No errors deleting products',
		)
	})
