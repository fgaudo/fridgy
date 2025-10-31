import { describe, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'

import * as H from '$lib/core/test-helpers.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'
import { command } from './add-product.ts'

describe.concurrent(`Add product`, () => {
	layer(
		Layer.provide(
			command,
			Layer.succeed(DbPlugin, {
				addProduct: Effect.fn(() => Effect.succeed(undefined)),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* AddProduct.Resolver

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
		Layer.provide(
			command,
			Layer.succeed(DbPlugin, {
				addProduct: Effect.fn(() => Effect.fail(undefined)),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* AddProduct.Resolver

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
				addProduct: () => {
					throw new Error()
				},
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const resolver = yield* AddProduct.Resolver

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
