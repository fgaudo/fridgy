import assert from 'assert'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set'

import * as ProductRepository from '../repository/product-repository.ts'
import * as GetSortedProducts from './get-products.ts'

/////
/////

type DeleteParameters = {
	ids: NonEmptyHashSet.NonEmptyHashSet<string>
}

/////
/////

export type Response = Data.TaggedEnum<{
	DeleteSucceededButRefreshFailed: object
	Failed: object
	Succeeded: {
		maybeProducts: Data.TaggedEnum.Value<
			GetSortedProducts.Response,
			'Succeeded'
		>['maybeProducts']
	}
}>

export const Response = Data.taggedEnum<Response>()

/////
/////

export class DeleteAndGetProducts extends Effect.Service<DeleteAndGetProducts>()(
	`feature/product-management/usecase/delete-and-get-products`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const resolver = (yield* ProductRepository.ProductRepository)
				.deleteProductByIdResolver

			const deleteProductById = (id: string) =>
				Effect.request(
					ProductRepository.DeleteProductById.Request({
						id,
					}),
					resolver,
				)

			const getAllProductsWithTotal = yield* GetSortedProducts.GetProducts

			return {
				run: Effect.fn(`DeleteProductsByIds UC`)(function* ({
					ids,
				}: DeleteParameters) {
					yield* Effect.logInfo(`Requested to delete products`)
					yield* Effect.logInfo(`Attempting to delete products...`)

					const deleteResults = yield* Effect.forEach(ids, deleteProductById, {
						batching: true,
					})

					const successes = Arr.reduce(deleteResults, 0, (acc, value) =>
						value ? acc + 1 : acc,
					)

					assert(successes <= deleteResults.length)
					assert(successes >= 0)

					if (successes <= 0) {
						return Response.Failed()
					}

					if (successes < deleteResults.length) {
						yield* Effect.logWarning(
							`${(deleteResults.length - successes).toString()} Products could not be deleted`,
						)
					}

					yield* Effect.logInfo(`${successes.toString()} Products deleted`)

					const fetchResult = yield* getAllProductsWithTotal.run

					return Match.valueTags(fetchResult, {
						Failed: () => Response.DeleteSucceededButRefreshFailed(),
						Succeeded: ({ maybeProducts }) =>
							Response.Succeeded({ maybeProducts }),
					})
				}),
			}
		}),

		dependencies: [GetSortedProducts.GetProducts.Default],
	},
) {}
