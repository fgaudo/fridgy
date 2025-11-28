import { describe, expect, layer } from '@effect/vitest'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as ProductRepository from '../repository/product-repository.ts'
import * as Usecase from './delete-and-get-products.ts'
import * as GetSortedProducts from './get-products.ts'

const DeleteParameters = Schema.Struct({
	ids: NonEmptyHashSet.Schema(Schema.String),
})

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(Usecase.DeleteAndGetProducts.DefaultWithoutDependencies, [
			makeTestLayer(ProductRepository.ProductRepository)({
				deleteProductByIdResolver: RequestResolver.fromEffect(() =>
					Effect.succeed(false),
				),
			}),
			makeTestLayer(GetSortedProducts.GetProducts)({}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return delete failed`,
			[DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.DeleteAndGetProducts
				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag === 'Failed').toBe(true)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.DeleteAndGetProducts.DefaultWithoutDependencies, [
			makeTestLayer(ProductRepository.ProductRepository)({
				deleteProductByIdResolver: RequestResolver.fromEffect(() =>
					Effect.succeed(true),
				),
			}),
			makeTestLayer(GetSortedProducts.GetProducts)({
				run: Effect.sync(() =>
					pipe(
						NonEmptyTrimmedString.unsafeFromString('asd'),
						Option.some,
						maybeName =>
							Option.some({
								total: PositiveInteger.unsafeFromNumber(1),
								list: Arr.make(
									GetSortedProducts.ProductDTO.Corrupt({ maybeName }),
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
				const { run } = yield* Usecase.DeleteAndGetProducts

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag === 'Succeeded').toBe(true)
			}),
		)
	})

	layer(
		Layer.provide(Usecase.DeleteAndGetProducts.DefaultWithoutDependencies, [
			makeTestLayer(ProductRepository.ProductRepository)({
				deleteProductByIdResolver: RequestResolver.fromEffect(() =>
					Effect.succeed(true),
				),
			}),
			makeTestLayer(GetSortedProducts.GetProducts)({
				run: Effect.sync(() => GetSortedProducts.Response.Failed()),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[DeleteParameters],
			Effect.fn(function* ([params]) {
				const { run } = yield* Usecase.DeleteAndGetProducts

				const exit = yield* Effect.exit(run(params))

				H.assertExitIsSuccess(exit)

				expect(exit.value._tag === 'DeleteSucceededButRefreshFailed').toBe(true)
			}),
		)
	})
})
