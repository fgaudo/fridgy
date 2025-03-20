import {
	describe,
	effect,
	layer,
} from '@effect/vitest'

import { Cl, Eff, L } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'

import { AddProductService } from '../interfaces/add-product.ts'
import {
	AddProductUseCase,
	useCase,
} from './add-product.ts'

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
					const service = yield* AddProductUseCase
					const exit = yield* Eff.exit(
						service({
							name,
							expirationDate,
						}),
					)

					H.assertExitIsSuccess(exit)
				}),
				L.provide(useCase, [
					L.succeed(AddProductService, product =>
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
			useCase,
			L.succeed(AddProductService, () =>
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
					const service = yield* AddProductUseCase
					const exit = yield* Eff.exit(
						service({
							name,
							expirationDate,
						}),
					)

					H.assertExitIsFailure(exit)
				}),
		)
	})
})
