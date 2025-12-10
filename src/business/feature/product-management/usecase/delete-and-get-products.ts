import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'

import * as ProductRepository from '../repository/product-repository.ts'
import * as GetProducts from './get-products.ts'

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
			GetProducts.Response,
			'Succeeded'
		>['maybeProducts']
	}
}>

export const Response = Data.taggedEnum<Response>()

/////
/////

// @effect-codegens accessors:b1c5b121b8178709
export class DeleteAndGetProducts extends Effect.Service<DeleteAndGetProducts>()(
	'da9e5f05edc3a0ba',
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

			const getProducts = yield* GetProducts.GetProducts

			return {
				run: Effect.fn(function* ({ ids }: DeleteParameters) {
					yield* Effect.logInfo('Requested to delete products')
					yield* Effect.logInfo('Attempting to delete products...')

					const maybeDeleteResults = yield* Effect.option(
						Effect.forEach(ids, deleteProductById, {
							batching: true,
						}),
					)

					if (Option.isNone(maybeDeleteResults)) {
						return Response.Failed()
					}

					yield* Effect.logInfo('Products deleted')

					const fetchResult = yield* getProducts.run

					return Match.valueTags(fetchResult, {
						Failed: () => Response.DeleteSucceededButRefreshFailed(),
						Succeeded: ({ maybeProducts }) =>
							Response.Succeeded({ maybeProducts }),
					})
				}, Effect.withLogSpan('DeleteAndGetProducts')),
			}
		}),

		dependencies: [GetProducts.GetProducts.Default],
	},
) {}
