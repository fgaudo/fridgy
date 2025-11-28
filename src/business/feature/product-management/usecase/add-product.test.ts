import { describe, effect, expect, layer } from '@effect/vitest'
import * as Deferred from 'effect/Deferred'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'
import * as TestClock from 'effect/TestClock'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductService from '../domain/product.ts'
import * as ProductRepository from '../repository/product-repository.ts'
import * as Usecase from './add-product.ts'
import { AddProduct } from './index.ts'

const AddProductParams = Schema.Struct({
	name: NonEmptyTrimmedString.Schema,
	maybeExpirationDate: Schema.Option(Integer.Schema),
})

describe.concurrent(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: AddProductParams },
		Effect.fn(function* ({ product: { name, maybeExpirationDate } }, _) {
			const observed = yield* Deferred.make<number>()

			const mockLayer = Layer.provide(
				AddProduct.AddProduct.Default,
				makeTestLayer(ProductRepository.ProductRepository)({
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
				Usecase.AddProduct.run({ maybeExpirationDate, name }),
				[mockLayer],
			)

			yield* TestClock.setTime(0)

			const exit = yield* Effect.exit(run)

			H.assertExitIsSuccess(exit)

			const creationDate = yield* Deferred.await(observed)

			expect(creationDate).toStrictEqual(0)
			expect(exit.value._tag === 'Succeeded').toBe(true)
		}),
	)

	layer(
		Layer.provide(
			Usecase.AddProduct.Default,
			makeTestLayer(ProductRepository.ProductRepository)({
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
			{ product: AddProductParams },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const { run } = yield* Usecase.AddProduct
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag === 'Failed').toBe(true)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.AddProduct.DefaultWithoutDependencies, [
			makeTestLayer(ProductRepository.ProductRepository)({
				addProduct: {
					resolver: RequestResolver.fromEffect(
						Effect.fn(() => Effect.succeed(false)),
					),
				},
			}),
			makeTestLayer(ProductService.ProductService)({
				makeProduct: () => Option.none(),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: AddProductParams },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const { run } = yield* Usecase.AddProduct
				const exit = yield* Effect.exit(
					run({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag === 'Failed').toBe(true)
			}),
		)
	})
})
