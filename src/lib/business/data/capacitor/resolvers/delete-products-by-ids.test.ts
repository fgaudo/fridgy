import { describe, layer } from '@effect/vitest'

import { Eff, L, Sc } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'
import { command } from './delete-product-by-id.ts'

describe(`Delete products by ids`, () => {
	layer(
		L.provide(
			command,
			L.succeed(DbPlugin, {
				deleteProductsByIds: () => Eff.succeed(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Sc.NonEmptyArray(DeleteProductById.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* DeleteProductById.Resolver

					const exit = yield* Eff.exit(
						Eff.forEach(requests, request => Eff.request(request, resolver)),
					)

					H.assertExitIsSuccess(exit)
				}),
		)
	})

	layer(L.provide(command, L.succeed(DbPlugin, {} as unknown as DbPlugin)))(
		({ effect }) => {
			effect.prop(
				`Should return an error`,
				[Sc.NonEmptyArray(DeleteProductById.Request)],
				([requests]) =>
					Eff.gen(function* () {
						const resolver = yield* DeleteProductById.Resolver

						const exit = yield* Eff.exit(
							Eff.forEach(requests, request => Eff.request(request, resolver)),
						)

						H.assertExitIsDie(exit)
					}),
			)
		},
	)

	layer(
		L.provide(
			command,
			L.succeed(DbPlugin, {
				deleteProductsByIds: () => Eff.fail(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Sc.NonEmptyArray(DeleteProductById.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* DeleteProductById.Resolver

					const exit = yield* Eff.exit(
						Eff.forEach(requests, request => Eff.request(request, resolver)),
					)

					H.assertExitIsFailure(exit)
				}),
		)
	})

	layer(
		L.provide(
			command,
			L.succeed(DbPlugin, {
				deleteProductsByIds: () => {
					throw new Error()
				},
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Sc.NonEmptyArray(DeleteProductById.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* DeleteProductById.Resolver

					const exit = yield* Eff.exit(
						Eff.forEach(requests, request => Eff.request(request, resolver)),
					)

					H.assertExitIsDie(exit)
				}),
		)
	})
})
