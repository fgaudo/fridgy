import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyIterableHelper from '@/core/non-empty-iterable.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './delete-products-by-ids-and-retrieve.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

const DeleteParameters = Schema.Struct({
	ids: NonEmptyHashSet.Schema(Schema.String),
})

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(Usecase.Service.DefaultWithoutDependencies, [
			makeTestLayer(ProductManager.Service)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(false)),
				},
			}),
			makeTestLayer(GetSortedProducts.Service)({}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return delete failed`,
			[DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual('Failed')
			}),
		)
	})

	layer(
		Layer.provide(Usecase.Service.DefaultWithoutDependencies, [
			makeTestLayer(ProductManager.Service)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(true)),
				},
			}),
			makeTestLayer(GetSortedProducts.Service)({
				run: Effect.sync(() =>
					pipe(
						NonEmptyTrimmedString.unsafeFromString('asd'),
						Option.some,
						maybeName =>
							Option.some({
								total: PositiveInteger.unsafeFromNumber(1),
								list: NonEmptyIterableHelper.make(
									GetSortedProducts.Product.Corrupt({ maybeName }),
								),
							}),
						maybeProducts =>
							GetSortedProducts.Response.Succeeded({
								maybeProducts,
							}),
					),
				),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual('Succeeded')
			}),
		)
	})

	layer(
		Layer.provide(Usecase.Service.DefaultWithoutDependencies, [
			makeTestLayer(ProductManager.Service)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(true)),
				},
			}),
			makeTestLayer(GetSortedProducts.Service)({
				run: Effect.sync(() => GetSortedProducts.Response.Failed()),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual('DeleteSucceededButRefreshFailed')
			}),
		)
	})
})
