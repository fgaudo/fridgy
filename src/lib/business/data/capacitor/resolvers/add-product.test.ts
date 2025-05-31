import { describe, layer } from '@effect/vitest'

import { Eff, L, Sc } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'
import { command } from './add-product.ts'

describe.concurrent(`Add product`, () => {
	layer(
		L.provide(
			command,
			L.succeed(DbPlugin, {
				addProduct: () => Eff.succeed(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Sc.NonEmptyArray(AddProduct.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* AddProduct.Resolver

					const exit = yield* Eff.exit(
						Eff.forEach(requests, request => Eff.request(request, resolver)),
					)

					H.assertExitIsSuccess(exit)
				}),
		)
	})

	layer(
		L.provide(
			command,
			L.succeed(DbPlugin, {
				addProduct: () => Eff.fail(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Sc.NonEmptyArray(AddProduct.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* AddProduct.Resolver

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
				addProduct: () => {
					throw new Error()
				},
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Sc.NonEmptyArray(AddProduct.Request)],
			([requests]) =>
				Eff.gen(function* () {
					const resolver = yield* AddProduct.Resolver

					const exit = yield* Eff.exit(
						Eff.forEach(requests, request => Eff.request(request, resolver)),
					)

					H.assertExitIsDie(exit)
				}),
		)
	})
})
