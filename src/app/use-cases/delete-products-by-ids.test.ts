import { describe, test } from 'vitest'

import { Eff, HS } from '@/core/imports'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers'
import { testRuntime } from '@/core/utils'

import {
	DeleteProductsByIdsService,
	DeleteProductsByIdsServiceError,
} from '@/app/interfaces/write/delete-products-by-ids'

import { useCase } from './delete-products-by-ids'

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
