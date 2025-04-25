import { describe, layer } from '@effect/vitest'

import {
	Eff,
	HS,
	L,
	NEHS,
} from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductsByIds as Query } from '$lib/business/app/queries.ts'

import * as Usecase from './delete-products-by-ids.ts'

describe('Delete products by ids', () => {
	layer(
		L.provide(
			Usecase.useCase,
			L.succeed(Query.Tag, () =>
				Eff.fail(undefined),
			),
		),
	)(({ effect }) => {
		effect.prop(
			'Should return an error',
			[H.FC.string()],
			ids =>
				Eff.gen(function* () {
					const service = yield* Usecase.Tag

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
			Usecase.useCase,
			L.succeed(Query.Tag, () =>
				Eff.succeed(undefined),
			),
		),
	)(({ effect }) => {
		effect.prop(
			'Should just work',
			[H.FC.string(), H.FC.string()],
			ids =>
				Eff.gen(function* () {
					const service = yield* Usecase.Tag

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
