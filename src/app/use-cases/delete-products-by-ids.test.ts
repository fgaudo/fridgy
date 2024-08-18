import { Exit } from 'effect'
import { assert, describe, test } from 'vitest'

import { Eff, HS } from '@/core/imports'
import { testRuntime } from '@/core/utils'

import {
	DeleteProductsByIdsService,
	DeleteProductsByIdsServiceError,
} from '../interfaces/write/delete-products-by-ids'
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

			const data =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
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

			const data =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)

	test.concurrent('Should work', async () => {
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

		const data = await testRuntime.runPromiseExit(
			deleteProducts,
		)

		assert(
			Exit.isSuccess(data),
			'Result is not an error',
		)
	})
})
