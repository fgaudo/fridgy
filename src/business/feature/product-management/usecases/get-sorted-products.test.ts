import { assert, describe, effect, expect, layer } from '@effect/vitest'
import * as Arbitrary from 'effect/Arbitrary'
import * as Effect from 'effect/Effect'
import * as Iterable from 'effect/Iterable'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './get-sorted-products.ts'

const GetSortedProductsSchema = Schema.Array(
	Schema.Struct({
		maybeId: Schema.Option(Schema.String),
		maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		maybeExpirationDate: Schema.Option(Integer.Schema),
		maybeCreationDate: Schema.Option(Integer.Schema),
	}),
)

describe.concurrent(`Get sorted products`, () => {
	layer(
		Layer.provide(
			Usecase.Service.Default,
			makeTestLayer(ProductManager.Service)({
				getSortedProducts: Effect.fail(undefined),
			}),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run)
				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual('Failed')
			}),
		)
	})

	effect.prop(
		`Should always return all elements`,
		[Arbitrary.make(GetSortedProductsSchema).filter(a => a.length > 0)],
		Effect.fn(
			function* ([products], { expect }) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run)

				H.assertExitIsSuccess(exit)

				assert(exit.value._tag === 'Succeeded')
				assert(Option.isSome(exit.value.maybeProducts))
				expect(
					Iterable.size(exit.value.maybeProducts.value.list),
				).toStrictEqual(products.length)
			},
			(effect, [products]) =>
				Effect.provide(
					effect,
					Layer.provide(
						Usecase.Service.Default,
						makeTestLayer(ProductManager.Service)({
							getSortedProducts: Effect.succeed(products),
						}),
					),
				),
		),
	)
})
