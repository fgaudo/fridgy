import { describe, test } from 'vitest'

import {
	Eff,
	HS,
	L,
	NEHS,
} from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/delete-products-by-ids.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command } from './delete-products-by-ids.ts'

const mockUsecase = (
	ids: NEHS.NonEmptyHashSet<string>,
) =>
	Eff.gen(function* () {
		return yield* (yield* DeleteProductsByIdsService)(
			ids,
		)
	})

describe('Delete products by ids', () => {
	test.concurrent(
		'Should just work',
		async () => {
			const deleteProductsByIds = Eff.provide(
				mockUsecase(
					NEHS.unsafe_fromHashSet(
						HS.fromIterable(['1', '2']),
					),
				),
				L.provide(
					command,
					L.succeed(CapacitorService, {
						db: {
							deleteProductsByIds: () =>
								Promise.resolve(undefined),
						} as unknown as FridgySqlitePlugin,
					}),
				),
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
			const deleteProductsByIds = Eff.provide(
				mockUsecase(
					NEHS.unsafe_fromHashSet(
						HS.fromIterable(['id']),
					),
				),
				L.provide(
					command,
					L.succeed(CapacitorService, {
						db: {} as unknown as FridgySqlitePlugin,
					}),
				),
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
			const deleteProductsByIds = Eff.provide(
				mockUsecase(
					NEHS.unsafe_fromHashSet(
						HS.fromIterable(['1']),
					),
				),
				L.provide(
					command,
					L.succeed(CapacitorService, {
						db: {
							deleteProductsByIds: () =>
								Promise.reject(new Error()),
						} as unknown as FridgySqlitePlugin,
					}),
				),
			)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProductsByIds,
				)

			H.assertExitIsFailure(exit)
		},
	)

	test.concurrent('Should crash', async () => {
		const deleteProductsByIds = Eff.provide(
			mockUsecase(
				NEHS.unsafe_fromHashSet(
					HS.fromIterable(['1']),
				),
			),
			L.provide(
				command,
				L.succeed(CapacitorService, {
					db: {
						deleteProductsByIds: () => {
							throw new Error()
						},
					} as unknown as FridgySqlitePlugin,
				}),
			),
		)

		const exit = await testRuntime.runPromiseExit(
			deleteProductsByIds,
		)

		H.assertExitIsDie(exit)
	})
})
