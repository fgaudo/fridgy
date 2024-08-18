import { Exit } from 'effect'
import { assert, describe, test } from 'vitest'

import { Eff, O } from '@/core/imports'

import {
	AddProductService,
	AddProductServiceError,
} from '../interfaces/write/add-product'
import { useCase } from './add-product'

describe('Add product', () => {
	test.concurrent(
		'Should just work',
		async () => {
			const addProduct = Eff.provideService(
				useCase({
					name: 'name',
					expirationDate: O.none(),
				}),
				AddProductService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.succeed(undefined)
					}),
			)

			const data =
				await Eff.runPromiseExit(addProduct)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)
		},
	)

	test.concurrent(
		'Should return error because of empty name',
		async () => {
			const addProduct = Eff.provideService(
				useCase({
					name: '',
					expirationDate: O.none(),
				}),
				AddProductService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.succeed(undefined)
					}),
			)

			const data =
				await Eff.runPromiseExit(addProduct)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)

	test.concurrent(
		'Should return error',
		async () => {
			const addProduct = Eff.provideService(
				useCase({
					name: 'test',
					expirationDate: O.none(),
				}),
				AddProductService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.fail(
							AddProductServiceError(''),
						)
					}),
			)

			const data =
				await Eff.runPromiseExit(addProduct)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)
})
