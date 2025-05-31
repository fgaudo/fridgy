import { E, Eff, NEHS, Sc } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductById as DeleteProductByIdOperation } from '$lib/business/app/operations'

export const DeleteProductsByIdsDTO = NEHS.NonEmptyHashSetSchema(Sc.String)

export type DeleteProductsByIdsDTO = Sc.Schema.Type<
	typeof DeleteProductsByIdsDTO
>

export class DeleteProductsByIds extends Eff.Service<DeleteProductsByIds>()(
	`app/useCases/DeleteProductsByIds`,
	{
		effect: Eff.gen(function* () {
			const deleteProductResolver = yield* DeleteProductByIdOperation.Resolver

			return (ids: DeleteProductsByIdsDTO) =>
				Eff.gen(function* () {
					yield* Eff.logInfo(`Requested to delete products`)

					yield* Eff.logInfo(`Attempting to delete products...`)

					const result = yield* Eff.either(
						Eff.forEach(
							ids,
							id =>
								Eff.request(
									new DeleteProductByIdOperation.Request({
										id,
									}),
									deleteProductResolver,
								),
							{ batching: true },
						),
					)

					if (E.isLeft(result)) {
						yield* Eff.logError(`Could not delete the products`)
						return yield* Eff.fail(undefined)
					}

					yield* Eff.logInfo(`Products deleted`)
				}).pipe(withLayerLogging(`A`))
		}),
	},
) {}
