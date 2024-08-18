import { fc, test } from '@fast-check/vitest'
import { describe } from 'vitest'

import { Eff, O } from '@/core/imports'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers'
import { testRuntime } from '@/core/utils'

import { CapacitorService } from '..'
import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'
import { command } from './add-product'

describe('Add product', () => {
	test.concurrent.prop([
		fc.constantFrom('name', ''),
		fc.constantFrom(O.some(0), O.none()),
	])(
		'Should just work',
		async (name, expDate) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate: expDate,
					creationDate: 0,
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

			assertExitIsSuccess(exit)
		},
	)

	test.concurrent.prop([
		fc.constantFrom('name', ''),
		fc.constantFrom(O.some(0), O.none()),
	])(
		'Should just work',
		async (name, expDate) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate: expDate,
					creationDate: 0,
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

			assertExitIsSuccess(exit)
		},
	)

	test.concurrent.prop([
		fc.constantFrom('name', ''),
		fc.constantFrom(O.some(0), O.none()),
	])(
		'Should return an error',
		async (name, expDate) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate: expDate,
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

			assertExitIsFailure(data)
		},
	)

	test.concurrent.prop([
		fc.constantFrom('name', ''),
		fc
			.constantFrom(NaN, Infinity, -Infinity, 3.5)
			.map(n => O.some(n)),
	])(
		'Should return an error',
		async (name, expDate) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate: expDate,
					creationDate: 0,
				}),
				CapacitorService,
				{
					db: {} as unknown as FridgySqlitePlugin,
				},
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			assertExitIsFailure(exit)
		},
	)

	test.concurrent.prop([
		fc.constantFrom('name', ''),
		fc.constantFrom(
			NaN,
			Infinity,
			-Infinity,
			3.5,
		),
	])(
		'Should return an error',
		async (name, creationDate) => {
			const addProduct = Eff.provideService(
				command({
					name,
					expirationDate: O.none(),
					creationDate: creationDate,
				}),
				CapacitorService,
				{
					db: {} as unknown as FridgySqlitePlugin,
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
