import { Effect } from 'effect'

import { B, E, Eff, HS } from '@/core/imports.js'

import { DeleteProductsByIdsService } from '@/app/interfaces/write/delete-products-by-ids.js'

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

export const useCase: DeleteProductsByIds = ids =>
	Effect.gen(function* () {
		if (HS.size(ids) <= 0) {
			return yield* Effect.fail(
				DeleteProductsByIdsError(
					'No ids provided',
				),
			)
		}

		yield* Effect.logDebug(
			'About to delete products',
		).pipe(eff =>
			Effect.annotateLogs('ids', ids)(eff),
		)

		const deleteProductsByIds =
			yield* DeleteProductsByIdsService

		const result = yield* deleteProductsByIds(
			ids,
		).pipe(eff => Eff.either(eff))

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
