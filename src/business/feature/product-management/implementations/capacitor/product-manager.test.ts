import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/test-helpers.ts'

import { SqliteCapacitorHelper } from '@/shared/capacitor/sqlite-capacitor-helper.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'
import * as CapacitorProductManager from './product-manager.ts'

describe.concurrent(`Add product`, () => {
	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				addProduct: () => Effect.succeed(undefined),
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.ProductManager

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
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				addProduct: () => Effect.fail(undefined),
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.ProductManager

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
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				addProduct: () => {
					throw new Error()
				},
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.ProductManager

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

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				deleteProductsByIds: () => Effect.succeed(undefined),
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.ProductManager

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
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(
				SqliteCapacitorHelper,
				{} as unknown as SqliteCapacitorHelper,
			),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.ProductManager

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsDie(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				deleteProductsByIds: () => Effect.fail(undefined),
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.ProductManager

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
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				deleteProductsByIds: () => {
					throw new Error()
				},
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.ProductManager

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

describe.concurrent(`Get products`, () => {
	effect.prop(
		`Should return a list`,
		[ProductManager.GetSortedProducts.DTO],
		Effect.fn(
			function* ([products], { expect }) {
				const { getSortedProducts } = yield* ProductManager.ProductManager
				const exit = yield* Effect.exit(getSortedProducts)

				H.assertExitIsSuccess(exit)

				expect(exit.value).toStrictEqual(
					products.map(product => ({
						...product,
						maybeId: product.maybeId.pipe(Option.map(JSON.stringify)),
					})),
				)
			},
			(effect, [products]) =>
				Effect.provide(
					effect,
					Layer.provide(
						CapacitorProductManager.layerWithoutDependencies,
						Layer.succeed(SqliteCapacitorHelper, {
							getAllProductsWithTotal: Effect.succeed(products),
						} as unknown as SqliteCapacitorHelper),
					),
				),
		),
	)

	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper, {
				getAllProductsWithTotal: Effect.fail(undefined),
			} as unknown as SqliteCapacitorHelper),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { getSortedProducts } = yield* ProductManager.ProductManager

				const exit = yield* Effect.exit(getSortedProducts)

				H.assertExitIsFailure(exit)
			}),
		)
	})
})
