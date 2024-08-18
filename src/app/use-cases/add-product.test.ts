import { fc, test } from '@fast-check/vitest'
import { describe } from 'vitest'

import { Eff, O } from '@/core/imports'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers'
import { testRuntime } from '@/core/utils'

import {
	AddProductService,
	AddProductServiceError,
} from '../interfaces/write/add-product'
import { useCase } from './add-product'

describe('Add product', () => {
	test.concurrent.prop([
		fc.constantFrom(O.some(0), O.none()),
	])('Should just work', async expDate => {
		const addProduct = Eff.provideService(
			useCase({
				name: 'name',
				expirationDate: expDate,
			}),
			AddProductService,
			() =>
				Eff.gen(function* () {
					return yield* Eff.succeed(undefined)
				}),
		)

		const exit =
			await testRuntime.runPromiseExit(addProduct)

		assertExitIsSuccess(exit)
	})

	test.concurrent.prop([
		fc.constantFrom(O.some(0), O.none()),
	])(
		'Should return error because of empty name',
		async expDate => {
			const addProduct = Eff.provideService(
				useCase({
					name: '',
					expirationDate: expDate,
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

			assertExitIsFailure(exit)
		},
	)

	test.concurrent.prop([
		fc.constantFrom(O.some(0), O.none()),
	])('Should return error', async expDate => {
		const addProduct = Eff.provideService(
			useCase({
				name: 'test',
				expirationDate: expDate,
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
			await testRuntime.runPromiseExit(addProduct)

		assertExitIsFailure(exit)
	})
})
