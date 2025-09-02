import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Schema from 'effect/Schema'

import { withLayerLogging } from '$lib/core/logging.ts'
import * as NonEmptyHashSet from '$lib/core/non-empty-hash-set.ts'

import { DeleteProductById as DeleteProductByIdOperation } from '$lib/business/app/operations'

export const DeleteProductsByIdsDTO = NonEmptyHashSet.Schema(Schema.String)

export type DeleteProductsByIdsDTO = Schema.Schema.Type<
	typeof DeleteProductsByIdsDTO
>

export class DeleteProductsByIds extends Effect.Service<DeleteProductsByIds>()(
	`app/useCases/DeleteProductsByIds`,
	{
		effect: Effect.gen(function* () {
			const deleteProductResolver = yield* DeleteProductByIdOperation.Resolver

			return (ids: DeleteProductsByIdsDTO) =>
				Effect.gen(function* () {
					yield* Effect.logInfo(`Requested to delete products`)

					yield* Effect.logInfo(`Attempting to delete products...`)

					const result = yield* Effect.either(
						Effect.forEach(
							ids,
							id =>
								Effect.request(
									new DeleteProductByIdOperation.Request({
										id,
									}),
									deleteProductResolver,
								),
							{ batching: true },
						),
					)

					if (Either.isLeft(result)) {
						yield* Effect.logError(`Could not delete the products`)
						return yield* Effect.fail(undefined)
					}

					yield* Effect.logInfo(`Products deleted`)
				}).pipe(withLayerLogging(`A`))
		}),
	},
) {}
