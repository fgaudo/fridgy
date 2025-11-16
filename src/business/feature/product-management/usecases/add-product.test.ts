import { describe, effect, expect, layer } from '@effect/vitest'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as TestClock from 'effect/TestClock'

import * as H from '@/core/test-helpers.ts'

import * as ProductService from '../domain/entities/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './add-product.ts'
import { AddProduct } from './index.ts'

describe.concurrent(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: Usecase.ProductDTO },
		Effect.fn(function* ({ product: { name, maybeExpirationDate } }, _) {
			const observed = yield* Deferred.make<number>()

			const mockLayer = Layer.provide(
				AddProduct.AddProduct.Default,
				Layer.succeed(ProductManager.ProductManager, {
					addProduct: {
						resolver: RequestResolver.fromEffect(
							Effect.fn(function* (req) {
								yield* Deferred.succeed(observed, req.creationDate)

								return Request.succeed(undefined)
							}),
						),
					},
				} as ProductManager.ProductManager[`Type`]),
			)

			const run = Effect.provide(
				Usecase.AddProduct.run({ maybeExpirationDate, name }),
				[mockLayer],
			)

			yield* TestClock.setTime(0)

			const exit = yield* Effect.exit(run)

			H.assertExitIsSuccess(exit)

			const creationDate = yield* Deferred.await(observed)

			expect(creationDate).toStrictEqual(0)
			expect(
				Usecase.Message.$is(`AddProductSucceeeded`)(exit.value),
			).toStrictEqual(true)
		}),
	)

	layer(
		Layer.provide(
			Usecase.AddProduct.Default,
			Layer.succeed(ProductManager.ProductManager, {
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.fail(Request.fail(undefined))),
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

	layer(
		Layer.provide(Usecase.AddProduct.DefaultWithoutDependencies, [
			Layer.succeed(ProductManager.ProductManager, {
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.fail(Request.fail(undefined))),
					),
				},
			} as ProductManager.ProductManager[`Type`]),

			Layer.succeed(ProductService.ProductService, {
				makeProduct: () => Option.none(),
			} as unknown as ProductService.ProductService),
		]),
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
