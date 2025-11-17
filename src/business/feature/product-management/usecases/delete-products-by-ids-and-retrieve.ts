import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Schema from 'effect/Schema'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

/////
/////

export const DTO = NonEmptyHashSet.Schema(Schema.String)

export type DTO = Schema.Schema.Type<typeof DTO>

/////
/////

export type Message = Data.TaggedEnum<{
	Failed: object
	DeleteSucceededButRefreshFailed: object
	Succeeded: {
		result: GetSortedProducts.DTO
	}
}>

export const Message = Data.taggedEnum<Message>()

/////
/////

export class Service extends Effect.Service<Service>()(
	`feature/product-management/usecases/delete-products-by-ids-and-retrieve`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const {
				deleteProductById: { resolver },
			} = yield* ProductManager.Service

			const getAllProductsWithTotal = yield* GetSortedProducts.Service

			return {
				run: Effect.fn(`DeleteProductsByIds UC`)(function* (ids: DTO) {
					yield* Effect.logInfo(`Requested to delete products`)
					yield* Effect.logInfo(`Attempting to delete products...`)

					const result = yield* Effect.either(
						Effect.forEach(
							ids,
							Effect.fn(id =>
								Effect.request(
									new ProductManager.DeleteProductById.Request({
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
						return Message.Failed()
					}

					yield* Effect.logInfo(`Products deleted`)

					const result2 = yield* getAllProductsWithTotal.run

					return GetSortedProducts.Message.$match(result2, {
						Failed: () => Message.DeleteSucceededButRefreshFailed(),
						Succeeded: ({ result }) => Message.Succeeded({ result }),
					})
				}),
			}
		}),

		dependencies: [GetSortedProducts.Service.Default],
	},
) {}
