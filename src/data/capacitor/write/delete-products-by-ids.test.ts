import { describe, test } from 'vitest'

import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/helper'
import { Eff, HS } from '@/core/imports'
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
			const addProduct = Eff.provideService(
				command(HS.fromIterable(['id'])),
				CapacitorService,
				{
					db: {
						addProduct: () =>
							Promise.resolve(undefined),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const addProduct = Eff.provideService(
				command(HS.fromIterable(['1'])),
				CapacitorService,
				{
					db: {
						addProduct: () =>
							Promise.reject(new Error()),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsFailure(exit)
		},
	)
})
