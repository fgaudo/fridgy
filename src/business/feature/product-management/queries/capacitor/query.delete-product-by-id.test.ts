import { describe, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import * as H from '@/core/test-helpers.ts'

import * as DeleteProductById from '../../../app/queries/delete-product-by-id.ts'
import { Db } from './db.ts'
import { command } from './queries/delete-product-by-id.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(
			command,
			Layer.succeed(Db, {
				deleteProductsByIds: () => Effect.succeed(undefined),
			} as unknown as Db),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const { resolver } = yield* DeleteProductById.DeleteProductById

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsSuccess(exit)
			}),
		)
	})

	layer(Layer.provide(command, Layer.succeed(Db, {} as unknown as Db)))(
		({ effect }) => {
			effect.prop(
				`Should return an error`,
				[Schema.NonEmptyArray(DeleteProductById.Request)],
				Effect.fn(function* ([requests]) {
					const { resolver } = yield* DeleteProductById.DeleteProductById

					const exit = yield* Effect.exit(
						Effect.forEach(requests, request =>
							Effect.request(request, resolver),
						),
					)

					H.assertExitIsDie(exit)
				}),
			)
		},
	)

	layer(
		Layer.provide(
			command,
			Layer.succeed(Db, {
				deleteProductsByIds: () => Effect.fail(undefined),
			} as unknown as Db),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const { resolver } = yield* DeleteProductById.DeleteProductById

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			command,
			Layer.succeed(Db, {
				deleteProductsByIds: () => {
					throw new Error()
				},
			} as unknown as Db),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const { resolver } = yield* DeleteProductById.DeleteProductById

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsDie(exit)
			}),
		)
	})
})
