import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Schema from 'effect/Schema'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set'

import * as DeleteProductById from '@/shared/app/queries/delete-product-by-id.ts'

import * as GetSortedProducts from '@/feature/home/app/usecases/get-sorted-products.ts'

export const DeleteProductsByIdsDTO = NonEmptyHashSet.Schema(Schema.String)

export type DeleteProductsByIdsDTO = Schema.Schema.Type<
	typeof DeleteProductsByIdsDTO
>

export type Message = Data.TaggedEnum<{
	DeleteFailed: object
	DeleteSucceededButRefreshFailed: object
	DeleteAndRefreshSucceeded: {
		result: GetSortedProducts.GetSortedProductsDTO
	}
}>

export const Message = Data.taggedEnum<Message>()

export class DeleteProductsByIdsAndRetrieve extends Effect.Service<DeleteProductsByIdsAndRetrieve>()(
	`home/usecases/DeleteProductsByIdsAndRetrieve`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { resolver } = yield* DeleteProductById.DeleteProductById
			const getAllProductsWithTotal = yield* GetSortedProducts.GetSortedProducts
			return {
				run: Effect.fn(`DeleteProductsByIds UC`)(function* (
					ids: DeleteProductsByIdsDTO,
				) {
					yield* Effect.logInfo(`Requested to delete products`)
					yield* Effect.logInfo(`Attempting to delete products...`)

					const result = yield* Effect.either(
						Effect.forEach(
							ids,
							Effect.fn(id =>
								Effect.request(
									new DeleteProductById.Request({
										id,
									}),
									resolver,
								),
							),
							{ batching: true },
						),
					)

					if (Either.isLeft(result)) {
						yield* Effect.logError(`Could not delete the products`)
						return Message.DeleteFailed()
					}

					yield* Effect.logInfo(`Products deleted`)

					const result2 = yield* getAllProductsWithTotal.run

					return GetSortedProducts.Message.$match(result2, {
						FetchListFailed: () => Message.DeleteSucceededButRefreshFailed(),
						FetchListSucceeded: ({ result }) =>
							Message.DeleteAndRefreshSucceeded({ result }),
					})
				}),
			}
		}),

		dependencies: [GetSortedProducts.GetSortedProducts.Default],
	},
) {}
