import { test } from '@fast-check/vitest'
import { describe } from 'vitest'

import { Eff, L } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { AddProductService } from '../interfaces/add-product.ts'
import {
	AddProductUseCase,
	useCase,
} from './add-product.ts'

describe('Add product', () => {
	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
	])(
		'Should just work',
		async (name, expirationDate) => {
			const addProduct = Eff.provide(
				Eff.gen(function* () {
					yield* (yield* AddProductUseCase)({
						name,
						expirationDate,
					})
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
			const addProduct = Eff.provideService(
				useCase({
					name,
					expirationDate,
				}),
				AddProductService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.fail(null)
					}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsFailure(exit)
		},
	)
})
