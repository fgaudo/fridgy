import {
	Eff,
	F,
	NEHS,
} from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductsByIds as DeleteProductsByIdsOperation } from '$lib/business/app/operations'

export class DeleteProductsByIds extends Eff.Service<DeleteProductsByIds>()(
	'app/useCases/DeleteProductsByIds',
	{
		effect: Eff.gen(function* () {
			const deleteProductsResolver =
				yield* DeleteProductsByIdsOperation.Resolver

			return (
				ids: NEHS.NonEmptyHashSet<string>,
			) =>
				Eff.gen(function* () {
					yield* Eff.logInfo(
						'User requested to delete products',
					)

					const fork = yield* Eff.fork(
						Eff.request(
							DeleteProductsByIdsOperation.Request(
								{
									ids,
								},
							),
							deleteProductsResolver,
						),
					)

					yield* Eff.logInfo(
						'Attempting to delete products...',
					)

					yield* F.join(fork)

					yield* Eff.logInfo('Products deleted')
				}).pipe(withLayerLogging('A'))
		}),
	},
) {}
