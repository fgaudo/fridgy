import { Effect as Eff, Effect } from 'effect'
import * as HS from 'effect/HashSet'

import { B, E } from '@/core/imports'

import { DeleteProductsByIdsService } from '../interfaces/write/delete-products-by-ids'

export type DeleteProductsByIds = (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsError,
	DeleteProductsByIdsService
>

export type DeleteProductsByIdsError = string &
	B.Brand<'DeleteProductsByIdsError'>

const DeleteProductsByIdsError =
	B.nominal<DeleteProductsByIdsError>()

export const command: DeleteProductsByIds = ids =>
	Effect.gen(function* () {
		const deleteProductsByIds =
			yield* DeleteProductsByIdsService

		if (HS.size(ids) <= 0) {
			yield* Effect.fail(
				DeleteProductsByIdsError(
					'No ids provided',
				),
			)
		}

		yield* Effect.logDebug(
			'About to delete products',
		).pipe(Effect.annotateLogs('ids', ids))

		const result = yield* deleteProductsByIds(
			ids,
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
			return yield* Eff.fail(
				DeleteProductsByIdsError(
					'There was a problem deleting the products',
				),
			)
		}

		yield* Effect.logDebug(
			'No errors deleting products',
		)
	})
