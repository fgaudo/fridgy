import { test } from '@fast-check/vitest'
import { describe } from 'vitest'

import { Eff } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command } from './add-product.ts'

describe('Add product', () => {
	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
		H.integer,
	])(
		'Should just work',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate,
					creationDate,
				}),
				CapacitorService,
				{
					db: {
						addProduct: () => Promise.resolve(),
					} as unknown as FridgySqlitePlugin,
				},
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
		H.integer,
	])(
		'Should just work',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate,
					creationDate,
				}),
				CapacitorService,
				{
					db: {
						addProduct: () => Promise.resolve(),
					} as unknown as FridgySqlitePlugin,
				},
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
		H.integer,
	])(
		'Should return an error',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate,
					creationDate,
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

			H.assertExitIsFailure(data)
		},
	)
})
