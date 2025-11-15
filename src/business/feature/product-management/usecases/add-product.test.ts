import { describe, effect, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'
import * as TestClock from 'effect/TestClock'
import { TestContext } from 'effect/TestContext'

import * as H from '@/core/test-helpers.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './add-product.ts'

describe.concurrent(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: Usecase.ProductDTO },
		Effect.fn(
			function* ({ product: { name, maybeExpirationDate } }, _) {
				const { run } = yield* Usecase.AddProduct
				yield* TestClock.setTime(0)
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)
				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`AddProductSucceeeded`)(exit.value),
				).toStrictEqual(true)
			},
			(effect, { product: { name, maybeExpirationDate } }, { expect }) =>
				Effect.provide(effect, [
					TestContext,
					Layer.provide(Usecase.AddProduct.Default, [
						Layer.succeed(ProductManager.ProductManager, {
							addProduct: {
								resolver: RequestResolver.fromEffect(
									Effect.fn(function* (request) {
										expect(request).toMatchObject({
											name,
											maybeExpirationDate,
											creationDate: 0,
										})
										return yield* Effect.succeed(undefined)
									}),
								),
							},
						} as ProductManager.ProductManager[`Type`]),
					]),
				]),
		),
		{ fastCheck: { verbose: 2 } },
	)

	layer(
		Layer.provide(
			Usecase.AddProduct.Default,
			Layer.succeed(ProductManager.ProductManager, {
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.fail(undefined)),
					),
				},
			} as ProductManager.ProductManager[`Type`]),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Usecase.ProductDTO },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const { run } = yield* Usecase.AddProduct
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`AddProductFailed`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})
})
