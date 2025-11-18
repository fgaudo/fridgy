import { describe, effect, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './get-sorted-products.ts'

describe.concurrent(`Get sorted products`, () => {
	layer(
		Layer.provide(
			Usecase.Service.Default,
			makeTestLayer(ProductManager.Service)({
				getSortedProducts: Effect.fail(undefined),
			}),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run)
				H.assertExitIsSuccess(exit)

				expect(Usecase.Message.$is(`Failed`)(exit.value)).toStrictEqual(true)
			}),
		)
	})

	effect.prop(
		`Should always return all elements`,
		[ProductManager.GetSortedProducts.DTO],
		Effect.fn(
			function* ([products], { expect }) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run)

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`Succeeded`)(exit.value) &&
						exit.value.result.length,
				).toStrictEqual(products.length)
			},
			(effect, [products]) =>
				Effect.provide(
					effect,
					Layer.provide(
						Usecase.Service.Default,
						makeTestLayer(ProductManager.Service)({
							getSortedProducts: Effect.succeed(products),
						}),
					),
				),
		),
	)
})
