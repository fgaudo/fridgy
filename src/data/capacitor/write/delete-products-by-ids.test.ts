import { describe, test } from 'vitest'

import { Eff, HS } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command } from './delete-products-by-ids.ts'

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

			H.assertExitIsSuccess(data)
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

			H.assertExitIsSuccess(data)
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

			H.assertExitIsFailure(exit)
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

			H.assertExitIsFailure(exit)
		},
	)
})
