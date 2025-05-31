import { describe, layer } from '@effect/vitest'

import { Eff, L, RR } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductById as Query } from '$lib/business/app/operations.ts'

import * as Usecase from './delete-products-by-ids.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		L.provide(
			Usecase.DeleteProductsByIds.Default,
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.fail(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Usecase.DeleteProductsByIdsDTO],
			([ids]) =>
				Eff.gen(function* () {
					const service = yield* Usecase.DeleteProductsByIds
					const exit = yield* Eff.exit(service(ids))

					H.assertExitIsFailure(exit)
				}),
		)
	})

	layer(
		L.provide(
			Usecase.DeleteProductsByIds.Default,
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.succeed(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(`Should just work`, [Usecase.DeleteProductsByIdsDTO], ([ids]) =>
			Eff.gen(function* () {
				const service = yield* Usecase.DeleteProductsByIds

				const exit = yield* Eff.exit(service(ids))

				H.assertExitIsSuccess(exit)
			}),
		)
	})
})
