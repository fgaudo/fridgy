import { test } from '@fast-check/vitest'
import { describe } from 'vitest'

import {
	Eff,
	Int,
	L,
	NETS,
	O,
} from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { AddProductService } from '../interfaces/add-product.ts'
import {
	AddProductUseCase,
	useCase,
} from './add-product.ts'

const mockMain = (product: {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
}) =>
	Eff.gen(function* () {
		yield* (yield* AddProductUseCase)(product)
	})

describe('Add product', () => {
	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
	])(
		'Should just work',
		async (name, expirationDate) => {
			const addProduct = Eff.provide(
				mockMain({
					name,
					expirationDate,
				}),
				useCase.pipe(
					L.provide(
						L.succeed(AddProductService, () =>
							Eff.gen(function* () {
								return yield* Eff.succeed(
									undefined,
								)
							}),
						),
					),
				),
			)
			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsSuccess(exit)
		},
	)

	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
	])(
		'Should return error',
		async (name, expirationDate) => {
			const addProduct = Eff.provide(
				mockMain({
					name,
					expirationDate,
				}),
				useCase.pipe(
					L.provide(
						L.succeed(AddProductService, () =>
							Eff.gen(function* () {
								return yield* Eff.fail(undefined)
							}),
						),
					),
				),
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsFailure(exit)
		},
	)
})
