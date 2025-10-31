import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'
import * as TestClock from 'effect/TestClock'
import { TestContext } from 'effect/TestContext'

import * as H from '$lib/core/test-helpers.ts'

import { AddProduct as Query } from '$lib/business/app/operations.ts'

import * as Usecase from './add-product.ts'

describe.concurrent(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: Usecase.ProductDTO },
		Effect.fn(
			function* ({ product: { name, maybeExpirationDate } }, _) {
				const service = yield* Usecase.AddProduct
				yield* TestClock.setTime(0)
				const exit = yield* Effect.exit(
					service({
						name,
						maybeExpirationDate,
					}),
				)
				H.assertExitIsSuccess(exit)
			},
			(effect, { product: { name, maybeExpirationDate } }, { expect }) =>
				Effect.provide(effect, [
					TestContext,
					Layer.provide(Usecase.AddProduct.Default, [
						Layer.succeed(
							Query.Resolver,
							RequestResolver.fromEffect(
								Effect.fn(function* (request) {
									expect(request).toMatchObject({
										name,
										maybeExpirationDate,
										creationDate: 0,
									})
									return yield* Effect.succeed(undefined)
								}),
							),
						),
					]),
				]),
		),
		{ fastCheck: { verbose: 2 } },
	)

	layer(
		Layer.provide(
			Usecase.AddProduct.Default,
			Layer.succeed(
				Query.Resolver,
				RequestResolver.fromEffect(Effect.fn(() => Effect.fail(undefined))),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Usecase.ProductDTO },
			Effect.fn(function* ({ product: { name, maybeExpirationDate } }) {
				const service = yield* Usecase.AddProduct
				const exit = yield* Effect.exit(
					service({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsFailure(exit)
			}),
		)
	})
})
