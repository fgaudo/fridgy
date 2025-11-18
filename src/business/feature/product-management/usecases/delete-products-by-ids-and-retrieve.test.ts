import { describe, expect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

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
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service
				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(Usecase.Message.$is(`Failed`)(exit.value)).toStrictEqual(true)
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
				run: Effect.succeed(
					GetSortedProducts.Message.Succeeded({ result: [] }),
				),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(Usecase.Message.$is(`Succeeded`)(exit.value)).toStrictEqual(true)
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
				run: Effect.succeed(GetSortedProducts.Message.Failed()),
			}),
		]),
	)(({ effect }) => {
		effect.prop(
			`Should return error`,
			[Usecase.DTO],
			Effect.fn(function* ([ids]) {
				const { run } = yield* Usecase.Service

				const exit = yield* Effect.exit(run(ids))

				H.assertExitIsSuccess(exit)

				expect(
					Usecase.Message.$is(`DeleteSucceededButRefreshFailed`)(exit.value),
				).toStrictEqual(true)
			}),
		)
	})
})
