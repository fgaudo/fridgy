import { describe, effect, layer } from '@effect/vitest'

import { Eff, Int, L, NETS, O } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'
import { Backend, query } from './get-sorted-products.ts'

function toModel(product: {
	id: number | undefined
	name: string | undefined
	creationDate: number | undefined
	expirationDate: number | undefined
}): GetSortedProducts.ProductDTO {
	return {
		maybeId: O.fromNullable(product.id).pipe(
			O.flatMap(id => {
				try {
					const idString = JSON.stringify(id)
					return O.some(idString)
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (_) {
					return O.none()
				}
			}),
		),
		maybeName: O.fromNullable(product.name).pipe(O.flatMap(NETS.fromString)),
		maybeCreationDate: O.fromNullable(product.creationDate).pipe(
			O.flatMap(Int.fromNumber),
		),
		maybeExpirationDate: O.fromNullable(product.expirationDate).pipe(
			O.flatMap(Int.fromNumber),
		),
	}
}

describe.concurrent(`Get products`, () => {
	effect.prop(`Should return a list`, [Backend], ([{ products }], { expect }) =>
		Eff.provide(
			Eff.gen(function* () {
				const service = yield* GetSortedProducts.Tag
				const exit = yield* Eff.exit(service)

				H.assertExitIsSuccess(exit)

				expect(exit.value).toStrictEqual(products.map(toModel))
			}),
			L.provide(
				query,
				L.succeed(DbPlugin, {
					getAllProductsWithTotal: Eff.succeed({
						total: products.length,
						products,
					}),
				} as unknown as DbPlugin),
			),
		),
	)

	layer(
		L.provide(
			query,
			L.succeed(DbPlugin, {
				getAllProductsWithTotal: Eff.succeed({}),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(`Should return an error`, () =>
			Eff.gen(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Eff.exit(service)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		L.provide(
			query,
			L.succeed(DbPlugin, {
				getAllProductsWithTotal: Eff.fail(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(`Should return an error`, () =>
			Eff.gen(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Eff.exit(service)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		L.provide(
			query,
			L.succeed(DbPlugin, {
				getAllProductsWithTotal: Eff.die(new Error()),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(`Should crash`, () =>
			Eff.gen(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Eff.exit(service)

				H.assertExitIsDie(exit)
			}),
		)
	})
})
