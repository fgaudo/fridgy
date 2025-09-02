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
		({ product: { name, maybeExpirationDate } }, { expect }) =>
			Effect.gen(function* () {
				const service = yield* Usecase.AddProduct
				yield* TestClock.setTime(0)
				const exit = yield* Effect.exit(
					service({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)
			}).pipe(
				Effect.provide([
					TestContext,
					Layer.provide(Usecase.AddProduct.Default, [
						Layer.succeed(
							Query.Resolver,
							RequestResolver.fromEffect(request =>
								Effect.gen(function* () {
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
				RequestResolver.fromEffect(() => Effect.fail(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Usecase.ProductDTO },
			({ product: { name, maybeExpirationDate } }) =>
				Effect.gen(function* () {
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
