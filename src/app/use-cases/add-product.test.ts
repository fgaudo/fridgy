import { test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'

import {
	Cl,
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

				L.provide(useCase, [
					L.succeed(AddProductService, () =>
						Eff.gen(function* () {
							return yield* Eff.fail(undefined)
						}),
					),
				]),
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsFailure(exit)
		},
	)
})
