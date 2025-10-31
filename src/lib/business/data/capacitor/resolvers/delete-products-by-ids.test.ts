import { describe, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'
import { command } from './delete-product-by-id.ts'

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(
			command,
			Layer.succeed(DbPlugin, {
				deleteProductsByIds: () => Effect.succeed(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* DeleteProductById.Resolver

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsSuccess(exit)
			}),
		)
	})

	layer(
		Layer.provide(command, Layer.succeed(DbPlugin, {} as unknown as DbPlugin)),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* DeleteProductById.Resolver

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsDie(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			command,
			Layer.succeed(DbPlugin, {
				deleteProductsByIds: () => Effect.fail(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* DeleteProductById.Resolver

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
			Layer.succeed(DbPlugin, {
				deleteProductsByIds: () => {
					throw new Error()
				},
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* DeleteProductById.Resolver

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
