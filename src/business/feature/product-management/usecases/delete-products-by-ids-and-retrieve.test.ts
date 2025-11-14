import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

import * as H from '@/core/test-helpers.ts'

import * as DeleteProductById from '../queries/delete-product-by-id.ts'
import * as GetSortedProducts from '../queries/get-sorted-products.ts'
import * as Usecase from './delete-products-by-ids-and-retrieve.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(Usecase.Service.Default, [
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
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(Usecase.Message.$is(`DeleteFailed`)(exit.value)).toStrictEqual(
					true,
				)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.Service.Default, [
			Layer.succeed(DeleteProductById.DeleteProductById, {
				resolver: RequestResolver.fromEffect(() => Effect.succeed(undefined)),
			}),
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.succeed([]),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`DeleteAndRefreshSucceeded`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.Service.Default, [
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
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`DeleteSucceededButRefreshFailed`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})
})
