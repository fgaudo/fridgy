import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import * as Integer from '../../../../core/integer/index.ts'
import * as NonEmptyTrimmedString from '../../../../core/non-empty-trimmed-string.ts'
import * as H from '../../../../core/test-helpers.ts'
import { GetSortedProducts } from '../../../app/operations.ts'
import { DbPlugin } from '../db-plugin.ts'
import { Backend, query } from './get-sorted-products.ts'

function toModel(product: {
	id: number | undefined
	name: string | undefined
	creationDate: number | undefined
	expirationDate: number | undefined
}): GetSortedProducts.ProductDTO {
	return {
		maybeId: Option.fromNullable(product.id).pipe(
			Option.flatMap(id => {
				try {
					const idString = JSON.stringify(id)
					return Option.some(idString)
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
				} catch (_) {
					return Option.none()
				}
			}),
		),
		maybeName: Option.fromNullable(product.name).pipe(
			Option.flatMap(NonEmptyTrimmedString.fromString),
		),
		maybeCreationDate: Option.fromNullable(product.creationDate).pipe(
			Option.flatMap(Integer.fromNumber),
		),
		maybeExpirationDate: Option.fromNullable(product.expirationDate).pipe(
			Option.flatMap(Integer.fromNumber),
		),
	}
}

describe.concurrent(`Get products`, () => {
	effect.prop(
		`Should return a list`,
		[Backend],
		Effect.fn(
			function* ([{ products }], { expect }) {
				const service = yield* GetSortedProducts.Tag
				const exit = yield* Effect.exit(service)

				H.assertExitIsSuccess(exit)

				expect(exit.value).toStrictEqual(products.map(toModel))
			},
			(effect, [{ products }]) =>
				Effect.provide(
					effect,
					Layer.provide(
						query,
						Layer.succeed(DbPlugin, {
							getAllProductsWithTotal: Effect.succeed({
								total: products.length,
								products,
							}),
						} as unknown as DbPlugin),
					),
				),
		),
	)

	layer(
		Layer.provide(
			query,
			Layer.succeed(DbPlugin, {
				getAllProductsWithTotal: Effect.succeed({}),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Effect.exit(service)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			query,
			Layer.succeed(DbPlugin, {
				getAllProductsWithTotal: Effect.fail(undefined),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Effect.exit(service)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			query,
			Layer.succeed(DbPlugin, {
				getAllProductsWithTotal: Effect.die(new Error()),
			} as unknown as DbPlugin),
		),
	)(({ effect }) => {
		effect(
			`Should crash`,
			Effect.fn(function* () {
				const service = yield* GetSortedProducts.Tag

				const exit = yield* Effect.exit(service)

				H.assertExitIsDie(exit)
			}),
		)
	})
})
