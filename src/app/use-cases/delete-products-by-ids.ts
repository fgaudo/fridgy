import { Effect } from 'effect'

import {
	A,
	B,
	E,
	Eff,
	H,
	HS,
} from '@/core/imports.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/write/delete-products-by-ids.ts'

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

		const deleteProductsByIds =
			yield* DeleteProductsByIdsService

		yield* H.logInfo('Deleting products').pipe(
			Effect.annotateLogs(
				'ids',
				A.fromIterable(ids),
			),
		)

		const result = yield* deleteProductsByIds(
			ids,
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* H.logError(result.left)

			return yield* Eff.fail(
				DeleteProductsByIdsError(
					'There was a problem deleting the products',
				),
			)
		}

		yield* H.logInfo(
			'Products deleted succesfully',
		).pipe(
			Effect.annotateLogs(
				'ids',
				A.fromIterable(ids),
			),
		)
	})
