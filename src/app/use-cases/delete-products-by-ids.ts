import {
	A,
	C,
	Eff,
	H,
	HS,
	L,
} from '@/core/imports.ts'

import { DeleteProductsByIdsService } from '../interfaces/delete-products-by-ids.ts'

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
			Eff.gen(function* () {
				H.logDebug(
					'Delete products use-case started',
				)
				if (HS.size(ids) <= 0) {
					H.logError(
						'No ids provided. This is probably a bug',
					)
					return yield* Eff.fail(undefined)
				}

				yield* deleteProductsByIds(ids)

				yield* H.logInfo('Products deleted').pipe(
					Eff.annotateLogs(
						'ids',
						A.fromIterable(ids),
					),
				)
			})
	}),
)
