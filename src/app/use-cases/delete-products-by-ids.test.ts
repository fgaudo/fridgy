import { describe, layer } from '@effect/vitest'

import {
	Eff,
	HS,
	L,
	NEHS,
} from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'

import { DeleteProductsByIdsService } from '../interfaces/delete-products-by-ids.ts'
import {
	DeleteProductsByIdsUseCase,
	useCase,
} from './delete-products-by-ids.ts'

describe('Delete products by ids', () => {
	layer(
		L.provide(
			useCase,
			L.succeed(DeleteProductsByIdsService, () =>
				Eff.fail(undefined),
			),
		),
	)(({ effect }) => {
		effect.prop(
			'Should return an error',
			[H.FC.string()],
			ids =>
				Eff.gen(function* () {
					const service =
						yield* DeleteProductsByIdsUseCase

					const exit = yield* Eff.exit(
						service(
							NEHS.unsafe_fromHashSet(
								HS.fromIterable(ids),
							),
						),
					)

					H.assertExitIsFailure(exit)
				}),
		)
	})

	layer(
		L.provide(
			useCase,
			L.succeed(DeleteProductsByIdsService, () =>
				Eff.succeed(undefined),
			),
		),
	)(({ effect }) => {
		effect.prop(
			'Should just work',
			[H.FC.string(), H.FC.string()],
			ids =>
				Eff.gen(function* () {
					const service =
						yield* DeleteProductsByIdsUseCase

					const exit = yield* Eff.exit(
						service(
							NEHS.unsafe_fromHashSet(
								HS.fromIterable(ids),
							),
						),
					)

					H.assertExitIsSuccess(exit)
				}),
		)
	})
})
