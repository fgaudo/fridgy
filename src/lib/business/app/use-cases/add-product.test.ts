import { describe, effect, layer } from '@effect/vitest'
import { Arbitrary, TestClock } from 'effect'
import { TestContext } from 'effect/TestContext'

import { Eff, L, RR } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { AddProduct as Query } from '$lib/business/app/operations.ts'

import * as Usecase from './add-product.ts'

describe(`Add product`, () => {
	effect.prop(
		`Should just work`,
		{ product: Arbitrary.make(Usecase.ProductDTO) },
		({ product: { name, maybeExpirationDate } }, { expect }) =>
			Eff.gen(function* () {
				const service = yield* Usecase.AddProduct
				yield* TestClock.setTime(0)
				const exit = yield* Eff.exit(
					service({
						name,
						maybeExpirationDate,
					}),
				)

				H.assertExitIsSuccess(exit)
			}).pipe(
				Eff.provide(TestContext),
				Eff.provide(
					L.provide(Usecase.AddProduct.Default, [
						L.succeed(
							Query.Resolver,
							RR.fromEffect(request =>
								Eff.gen(function* () {
									expect(request).toMatchObject({
										name,
										maybeExpirationDate,
										creationDate: 0,
									})
									return yield* Eff.succeed(undefined)
								}),
							),
						),
					]),
				),
			),
		{ fastCheck: { verbose: 2 } },
	)

	layer(
		L.provide(
			Usecase.AddProduct.Default,
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.fail(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			{ product: Arbitrary.make(Usecase.ProductDTO) },
			({ product: { name, maybeExpirationDate } }) =>
				Eff.gen(function* () {
					const service = yield* Usecase.AddProduct
					const exit = yield* Eff.exit(
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
