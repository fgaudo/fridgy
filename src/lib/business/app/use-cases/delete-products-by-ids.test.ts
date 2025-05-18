import { describe, layer } from '@effect/vitest'

import { Eff, FC, HS, L, NEHS, RR } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductById as Query } from '$lib/business/app/operations.ts'

import { OperationFailed } from '../operations/delete-product-by-id.ts'
import * as Usecase from './delete-products-by-ids.ts'

describe(`Delete products by ids`, () => {
	layer(
		L.provide(
			Usecase.DeleteProductsByIds.Default,
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.fail(new OperationFailed())),
			),
		),
	)(({ effect }) => {
		effect.prop(`Should return an error`, [FC.string()], ids =>
			Eff.gen(function* () {
				const service = yield* Usecase.DeleteProductsByIds

				const exit = yield* Eff.exit(
					service(NEHS.unsafeFromHashSet(HS.fromIterable(ids))),
				)

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
		effect.prop(`Should just work`, [FC.string(), FC.string()], ids =>
			Eff.gen(function* () {
				const service = yield* Usecase.DeleteProductsByIds

				const exit = yield* Eff.exit(
					service(NEHS.unsafeFromHashSet(HS.fromIterable(ids))),
				)

				H.assertExitIsSuccess(exit)
			}),
		)
	})
})
