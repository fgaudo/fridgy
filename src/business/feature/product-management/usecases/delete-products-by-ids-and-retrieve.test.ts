import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

import * as H from '@/core/test-helpers.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './delete-products-by-ids-and-retrieve.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(Usecase.DeleteProductsByIdsAndRetrieve.Default, [
			Layer.succeed(ProductManager.ProductManager, {
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.fail(undefined)),
				},
			} as unknown as ProductManager.ProductManager[`Type`]),
			Layer.succeed(
				GetSortedProducts.GetSortedProducts,
				{} as unknown as GetSortedProducts.GetSortedProducts,
			),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return delete failed`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve
				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(Usecase.Message.$is(`DeleteFailed`)(exit.value)).toStrictEqual(
					true,
				)
			}),
		)
	})

	layer(
		Layer.provide(
			Usecase.DeleteProductsByIdsAndRetrieve.DefaultWithoutDependencies,
			[
				Layer.succeed(ProductManager.ProductManager, {
					deleteProductById: {
						resolver: RequestResolver.fromEffect(() =>
							Effect.succeed(undefined),
						),
					},
				} as unknown as ProductManager.ProductManager[`Type`]),
				Layer.succeed(GetSortedProducts.GetSortedProducts, {
					run: Effect.succeed(
						GetSortedProducts.Message.FetchListSucceeded({ result: [] }),
					),
				} as unknown as GetSortedProducts.GetSortedProducts),
			],
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`DeleteAndRefreshSucceeded`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})

	layer(
		Layer.provide(
			Usecase.DeleteProductsByIdsAndRetrieve.DefaultWithoutDependencies,
			[
				Layer.succeed(ProductManager.ProductManager, {
					deleteProductById: {
						resolver: RequestResolver.fromEffect(() =>
							Effect.succeed(undefined),
						),
					},
				} as unknown as ProductManager.ProductManager[`Type`]),
				Layer.succeed(GetSortedProducts.GetSortedProducts, {
					run: Effect.succeed(GetSortedProducts.Message.FetchListFailed()),
				} as unknown as GetSortedProducts.GetSortedProducts),
			],
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.DeleteProductsByIdsAndRetrieve

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`DeleteSucceededButRefreshFailed`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})
})
