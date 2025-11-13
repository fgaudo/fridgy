import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as H from '@/core/test-helpers.ts'

import * as GetSortedProducts from '@/shared/app/queries/get-sorted-products.ts'

import * as Usecase from './get-sorted-products.ts'

describe.concurrent(`Get sorted products`, () => {
	layer(
		Layer.provide(
			Usecase.GetSortedProducts.Default,
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.fail(new GetSortedProducts.FetchingFailed()),
			}),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { run } = yield* Usecase.GetSortedProducts
				const exit = yield* Effect.exit(run)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			Usecase.GetSortedProducts.Default,
			Layer.succeed(GetSortedProducts.GetSortedProducts, {
				run: Effect.fail(new GetSortedProducts.InvalidDataReceived()),
			}),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { run } = yield* Usecase.GetSortedProducts
				const exit = yield* Effect.exit(run)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	effect.prop(
		`Should always return all elements`,
		[GetSortedProducts.GetSortedProductsDTO],
		Effect.fn(
			function* ([products], { expect }) {
				const { run } = yield* Usecase.GetSortedProducts

				const exit = yield* Effect.exit(run)

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`FetchListSucceeded`)(exit.value) &&
						exit.value.result.length,
				).toStrictEqual(products.length)
			},
			(effect, [products]) =>
				Effect.provide(
					effect,
					Layer.provide(
						Usecase.GetSortedProducts.Default,
						Layer.succeed(GetSortedProducts.GetSortedProducts, {
							run: Effect.succeed(products),
						}),
					),
				),
		),
	)
})
