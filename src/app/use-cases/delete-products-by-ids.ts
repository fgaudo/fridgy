import { Effect } from 'effect'

import {
	A,
	C,
	E,
	Eff,
	H,
	HS,
	L,
} from '@/core/imports.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/delete-products-by-ids.ts'

export class DeleteProductsByIdsUseCase extends C.Tag(
	'DeleteProductsByIdsUseCase',
)<
	DeleteProductsByIdsUseCase,
	(
		ids: HS.HashSet<string>,
	) => Eff.Effect<void, void>
>() {}

export const useCase = L.effect(
	DeleteProductsByIdsUseCase,
	Eff.gen(function* () {
		const deleteProductsByIds =
			yield* DeleteProductsByIdsService

		return ids =>
			Effect.gen(function* () {
				if (HS.size(ids) <= 0) {
					return yield* Effect.fail(undefined)
				}

				yield* H.logInfo(
					'Deleting products',
				).pipe(
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

					return yield* Eff.fail(undefined)
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
	}),
)
