import {
	describe,
	effect,
	layer,
} from '@effect/vitest'

import { Cl, Eff, L } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { AddProduct as Query } from '$lib/business/app/queries.ts'

import * as Usecase from './add-product.ts'

describe('Add product', () => {
	effect.prop(
		'Should just work',
		{
			name: H.nonEmptyTrimmedString,
			expirationDate: H.maybeInteger,
		},
		({ name, expirationDate }, { expect }) =>
			Eff.provide(
				Eff.gen(function* () {
					const service = yield* Usecase.Tag
					const exit = yield* Eff.exit(
						service({
							name,
							maybeExpirationDate: expirationDate,
						}),
					)

					H.assertExitIsSuccess(exit)
				}),
				L.provide(Usecase.useCase, [
					L.succeed(Query.AddProduct, product =>
						Eff.gen(function* () {
							expect(product).toStrictEqual({
								name,
								expirationDate,
								creationDate: 0,
							})

							return yield* Eff.succeed(undefined)
						}),
					),
					L.setClock({
						currentTimeMillis: Eff.succeed(0),
					} as Cl.Clock),
				]),
			),
	)

	layer(
		L.provide(
			Usecase.useCase,
			L.succeed(Query.AddProduct, () =>
				Eff.fail(undefined),
			),
		),
	)(({ effect }) => {
		effect.prop(
			'Should return error',
			{
				name: H.nonEmptyTrimmedString,
				expirationDate: H.maybeInteger,
			},
			({ name, expirationDate }) =>
				Eff.gen(function* () {
					const service = yield* Usecase.Tag
					const exit = yield* Eff.exit(
						service({
							name,
							maybeExpirationDate: expirationDate,
						}),
					)

					H.assertExitIsFailure(exit)
				}),
		)
	})
})
