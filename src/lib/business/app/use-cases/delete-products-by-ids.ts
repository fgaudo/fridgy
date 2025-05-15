import { E, Eff, NEHS, Sc } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductsByIds as DeleteProductsByIdsOperation } from '$lib/business/app/operations'

export const DeleteProductsByIdsDTO = Sc.fromBrand(
	NEHS.NonEmptyHashSet<string>(),
)(Sc.HashSet(Sc.String))

export type DeleteProductsByIdsDTO = Sc.Schema.Type<
	typeof DeleteProductsByIdsDTO
>

export class DeleteProductsByIds extends Eff.Service<DeleteProductsByIds>()(
	`app/useCases/DeleteProductsByIds`,
	{
		effect: Eff.gen(function* () {
			const deleteProductsResolver =
				yield* DeleteProductsByIdsOperation.Resolver

			return (ids: DeleteProductsByIdsDTO) =>
				Eff.gen(function* () {
					yield* Eff.logInfo(`Requested to delete products`)

					yield* Eff.logInfo(`Attempting to delete products...`)

					const result = yield* Eff.either(
						Eff.request(
							DeleteProductsByIdsOperation.Request({
								ids,
							}),
							deleteProductsResolver,
						),
					)

					if (E.isLeft(result)) {
						yield* Eff.logError(`Could not delete the products`)

						return yield* result.left
					}

					yield* Eff.logInfo(`Products deleted`)
				}).pipe(withLayerLogging(`A`))
		}),
	},
) {}
