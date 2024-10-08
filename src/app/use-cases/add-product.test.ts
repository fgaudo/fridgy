import { test } from '@fast-check/vitest'
import { describe } from 'vitest'

import { Eff } from '@/core/imports.js'
import * as H from '@/core/test-helpers.js'
import { testRuntime } from '@/core/utils.js'

import {
	AddProductService,
	AddProductServiceError,
} from '../interfaces/write/add-product.js'
import { useCase } from './add-product.js'

describe('Add product', () => {
	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
	])(
		'Should just work',
		async (name, expirationDate) => {
			const addProduct = Eff.provideService(
				useCase({
					name,
					expirationDate,
				}),
				AddProductService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.succeed(undefined)
					}),
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
						return yield* Eff.fail(
							AddProductServiceError(''),
						)
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
