import { describe, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductById as Query } from '$lib/business/app/operations.ts'

import * as Usecase from './delete-products-by-ids.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(
			Usecase.DeleteProductsByIds.Default,
			Layer.succeed(
				Query.Resolver,
				RequestResolver.fromEffect(() => Effect.fail(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Usecase.DeleteProductsByIdsDTO],
			Effect.fn(function* ([ids]) {
				const service = yield* Usecase.DeleteProductsByIds
				const exit = yield* Effect.exit(service(ids))

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			Usecase.DeleteProductsByIds.Default,
			Layer.succeed(
				Query.Resolver,
				RequestResolver.fromEffect(() => Effect.succeed(undefined)),
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DeleteProductsByIdsDTO],
			Effect.fn(function* ([ids]) {
				const service = yield* Usecase.DeleteProductsByIds

				const exit = yield* Effect.exit(service(ids))

				H.assertExitIsSuccess(exit)
			}),
		)
	})
})
