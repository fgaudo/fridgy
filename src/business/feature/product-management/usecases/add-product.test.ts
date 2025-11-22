import { describe, effect, expect, layer } from '@effect/vitest'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as TestClock from 'effect/TestClock'

import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductService from '../domain/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './add-product.ts'
import { AddProduct } from './index.ts'

describe.concurrent(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: Usecase.AddProductParams },
		Effect.fn(function* ({ product: { name, maybeExpirationDate } }, _) {
			const observed = yield* Deferred.make<number>()

			const mockLayer = Layer.provide(
				AddProduct.Service.Default,
				makeTestLayer(ProductManager.Service)({
					addProduct: {
						resolver: RequestResolver.fromEffect(
							Effect.fn(function* (req) {
								yield* Deferred.succeed(observed, req.creationDate)

								return yield* Effect.succeed(true)
							}),
						),
					},
				}),
			)

			const run = Effect.provide(
				Usecase.Service.run({ maybeExpirationDate, name }),
				[mockLayer],
			)

			yield* TestClock.setTime(0)

			const exit = yield* Effect.exit(run)

			H.assertExitIsSuccess(exit)

			const creationDate = yield* Deferred.await(observed)

			expect(creationDate).toStrictEqual(0)
			expect(exit.value._tag).toStrictEqual(Usecase.Response.Succeeded._tag)
		}),
	)

	layer(
		Layer.provide(
			Usecase.Service.Default,
			makeTestLayer(ProductManager.Service)({
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.succeed(false)),
					),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Usecase.AddProductParams },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual(Usecase.Response.Failed._tag)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.Service.DefaultWithoutDependencies, [
			makeTestLayer(ProductManager.Service)({
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.succeed(false)),
					),
				},
			}),
			makeTestLayer(ProductService.Service)({
				makeProduct: () => Option.none(),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Usecase.AddProductParams },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual(Usecase.Response.Failed._tag)
			}),
		)
	})
})
