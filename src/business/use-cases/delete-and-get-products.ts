import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Match from 'effect/Match'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'

import * as DeleteProductById from '@/ports/delete-product-by-id.ts'

import * as GetProducts from './get-products.ts'

type DeleteParameters = {
	ids: NonEmptyHashSet.NonEmptyHashSet<string>
}

export type Response = Data.TaggedEnum<{
	DeleteSucceededButRefreshFailed: object
	Failed: object
	Succeeded: {
		maybeProducts: Data.TaggedEnum.Value<
			GetProducts.Response,
			'Succeeded'
		>['products']
	}
}>

export const Response = Data.taggedEnum<Response>()

export class DeleteAndGetProducts extends ServiceMap.Service<DeleteAndGetProducts>()(
	'da9e5f05edc3a0ba',
	{
		make: Effect.gen(function* () {
			const deleteById = Effect.request(
				(yield* DeleteProductById.DeleteProductById).resolver,
			)

			const getProducts = yield* GetProducts.GetProducts

			return {
				run: Effect.fn(function* ({ ids }: DeleteParameters) {
					yield* Effect.logInfo('Requested to delete products')
					yield* Effect.logInfo('Attempting to delete products...')

					const maybeDeleteResults = yield* pipe(
						ids,
						HashSet.map(id =>
							DeleteProductById.Request({
								id,
							}),
						),
						Effect.forEach(deleteById, {
							concurrency: 'unbounded',
						}),
						Effect.option,
					)

					if (Option.isNone(maybeDeleteResults)) {
						return Response.Failed()
					}

					yield* Effect.logInfo('Products deleted')

					const fetchResult = yield* getProducts.run

					return Match.valueTags(fetchResult, {
						Failed: () => Response.DeleteSucceededButRefreshFailed(),
						Succeeded: ({ products: maybeProducts }) =>
							Response.Succeeded({ maybeProducts }),
					})
				}, Effect.withLogSpan('DeleteAndGetProducts')),
			}
		}),
	},
) {
	static layer = Layer.provide(
		Layer.effect(this, this.make),
		GetProducts.GetProducts.layer,
	)
}
