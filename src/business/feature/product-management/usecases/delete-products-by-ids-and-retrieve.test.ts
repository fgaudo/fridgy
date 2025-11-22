import { describe, expect, layer } from '@effect/vitest'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'

import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductManager from '../interfaces/product-manager.ts'
import * as Usecase from './delete-products-by-ids-and-retrieve.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

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
			[Usecase.DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual(Usecase.Response.Failed._tag)
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
							GetSortedProducts.Response.Succeeded.ProductDTO.Corrupt({
								maybeName,
							}),
						Arr.make,
						Option.some,
						maybeProducts =>
							new GetSortedProducts.Response.Succeeded({
								result: maybeProducts,
							}),
					),
				),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual(Usecase.Response.Succeeded._tag)
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
				run: Effect.sync(() => new GetSortedProducts.Response.Failed()),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[Usecase.DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag).toStrictEqual(
					Usecase.Response.DeleteSucceededButRefreshFailed._tag,
				)
			}),
		)
	})
})
