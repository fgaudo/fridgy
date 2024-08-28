import { describe, test } from 'vitest'

import { Eff, HS } from '@/core/imports.js'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers.js'
import { testRuntime } from '@/core/utils.js'

import {
	DeleteProductsByIdsService,
	DeleteProductsByIdsServiceError,
} from '../interfaces/write/delete-products-by-ids.js'
import { useCase } from './delete-products-by-ids.js'

describe('Delete products by ids', () => {
	test.concurrent(
		'Should return an error',
		async () => {
			const deleteProducts = Eff.provideService(
				useCase(HS.fromIterable(['test'])),
				DeleteProductsByIdsService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.fail(
							DeleteProductsByIdsServiceError(''),
						)
					}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent(
		'Should return an error on empty ids',
		async () => {
			const deleteProducts = Eff.provideService(
				useCase(HS.empty()),
				DeleteProductsByIdsService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.succeed(undefined)
					}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent(
		'Should just work',
		async () => {
			const deleteProducts = Eff.provideService(
				useCase(
					HS.fromIterable(['test1', 'test2']),
				),
				DeleteProductsByIdsService,
				() =>
					Eff.gen(function* () {
						return yield* Eff.succeed(undefined)
					}),
			)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assertExitIsSuccess(exit)
		},
	)
})
