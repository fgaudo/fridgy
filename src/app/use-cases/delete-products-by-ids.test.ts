import { describe, test } from 'vitest'

import {
	Eff,
	HS,
	L,
	NEHS,
} from '@/core/imports.ts'
import {
	assertExitIsFailure,
	assertExitIsSuccess,
} from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { DeleteProductsByIdsService } from '../interfaces/delete-products-by-ids.ts'
import {
	DeleteProductsByIdsUseCase,
	useCase,
} from './delete-products-by-ids.ts'

const mockMain = (
	ids: NEHS.NonEmptyHashSet<string>,
) =>
	Eff.gen(function* () {
		yield* (yield* DeleteProductsByIdsUseCase)(
			ids,
		)
	})

describe('Delete products by ids', () => {
	test.concurrent(
		'Should return an error',
		async () => {
			const deleteProducts = Eff.provide(
				mockMain(
					NEHS.unsafe_fromHashSet(
						HS.fromIterable(['test']),
					),
				),
				useCase.pipe(
					L.provide(
						L.succeed(
							DeleteProductsByIdsService,
							() =>
								Eff.gen(function* () {
									return yield* Eff.fail(
										undefined,
									)
								}),
						),
					),
				),
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
			const deleteProducts = Eff.provide(
				mockMain(
					NEHS.unsafe_fromHashSet(
						HS.fromIterable(['test1', 'test2']),
					),
				),
				useCase.pipe(
					L.provide(
						L.succeed(
							DeleteProductsByIdsService,
							() =>
								Eff.gen(function* () {
									return yield* Eff.succeed(
										undefined,
									)
								}),
						),
					),
				),
			)

			const exit =
				await testRuntime.runPromiseExit(
					deleteProducts,
				)

			assertExitIsSuccess(exit)
		},
	)
})
