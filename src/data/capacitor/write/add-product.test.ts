import { Exit } from 'effect'
import { assert, describe, test } from 'vitest'

import { Eff, O } from '@/core/imports'
import { testRuntime } from '@/core/utils'

import { CapacitorService } from '..'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'
import { command } from './add-product'

describe('Add product', () => {
	test.concurrent(
		'Should just work',
		async () => {
			const addProduct = Eff.provideService(
				command({
					name: 'name',
					expirationDate: O.none(),
					creationDate: 0,
				}),
				CapacitorService,
				{
					db: {
						addProduct: () => Promise.resolve(),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)
		},
	)

	test.concurrent(
		'Should just work',
		async () => {
			const addProduct = Eff.provideService(
				command({
					name: 'name',
					expirationDate: O.some(3),
					creationDate: 0,
				}),
				CapacitorService,
				{
					db: {
						addProduct: () => Promise.resolve(),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assert(
				Exit.isSuccess(data),
				'Result is not a success',
			)
		},
	)

	test.concurrent(
		'Should return an error',
		async () => {
			const addProduct = Eff.provideService(
				command({
					name: 'name',
					expirationDate: O.none(),
					creationDate: 0,
				}),
				CapacitorService,
				{
					db: {
						addProduct: () =>
							Promise.reject(new Error()),
					} as unknown as FridgySqlitePlugin,
				},
			)

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assert(
				Exit.isFailure(data),
				'Result is not an error',
			)
		},
	)
})
