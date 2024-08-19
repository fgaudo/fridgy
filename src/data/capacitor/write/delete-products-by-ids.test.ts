import { describe, test } from 'vitest'

import { Eff, HS } from '@/core/imports'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers'
import { testRuntime } from '@/core/utils'

import { CapacitorService } from '..'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'
import { command } from './delete-products-by-ids'

describe('Delete products by ids', () => {
	test.concurrent(
		'Should just work',
		async () => {
			const deleteProductsByIds =
				Eff.provideService(
					command(HS.empty()),
					CapacitorService,
					{
						db: {
							deleteProductsByIds: () =>
								Promise.resolve(undefined),
						} as unknown as FridgySqlitePlugin,
					},
				)

			const data =
				await testRuntime.runPromiseExit(
					deleteProductsByIds,
				)

			assertExitIsSuccess(data)
		},
	)

	test.concurrent(
		'Should just work',
		async () => {
			const deleteProductsByIds =
				Eff.provideService(
					command(HS.fromIterable(['1', '2'])),
					CapacitorService,
					{
						db: {
							deleteProductsByIds: () =>
								Promise.resolve(undefined),
						} as unknown as FridgySqlitePlugin,
					},
				)

			const data =
				await testRuntime.runPromiseExit(
					deleteProductsByIds,
				)

			assertExitIsSuccess(data)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const deleteProductsByIds =
				Eff.provideService(
					command(HS.fromIterable(['id'])),
					CapacitorService,
					{
						db: {} as unknown as FridgySqlitePlugin,
					},
				)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProductsByIds,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const deleteProductsByIds =
				Eff.provideService(
					command(HS.fromIterable(['1'])),
					CapacitorService,
					{
						db: {
							deleteProductsByIds: () =>
								Promise.reject(new Error()),
						} as unknown as FridgySqlitePlugin,
					},
				)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProductsByIds,
				)

			assertExitIsFailure(exit)
		},
	)
})
