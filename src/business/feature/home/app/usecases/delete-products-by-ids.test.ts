import { describe, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

import * as H from '@/core/test-helpers.ts'

import * as DeleteProductById from '@/shared/app/queries/delete-product-by-id.ts'
import * as GetSortedProducts from '@/shared/app/queries/get-sorted-products.ts'

import * as Usecase from './delete-products-by-ids-and-retrieve.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(Usecase.DeleteProductsByIdsAndRetrieve.Default, [
			Layer.succeed(DeleteProductById.DeleteProductById, {
				resolver: RequestResolver.fromEffect(() => Effect.fail(undefined)),
			}),
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.succeed(
					{} as unknown as GetSortedProducts.GetSortedProductsDTO,
				),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Usecase.DeleteProductsByIdsDTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve
				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.DeleteProductsByIdsAndRetrieve.Default, [
			Layer.succeed(DeleteProductById.DeleteProductById, {
				resolver: RequestResolver.fromEffect(() => Effect.succeed(undefined)),
			}),
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.succeed(
					{} as unknown as GetSortedProducts.GetSortedProductsDTO,
				),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DeleteProductsByIdsDTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.DeleteProductsByIdsAndRetrieve.Default, [
			Layer.succeed(DeleteProductById.DeleteProductById, {
				resolver: RequestResolver.fromEffect(() => Effect.succeed(undefined)),
			}),
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.fail(new GetSortedProducts.FetchingFailed()),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[Usecase.DeleteProductsByIdsDTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsFailure(exit)
			}),
		)
	})
})
