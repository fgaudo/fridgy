import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/test-helpers.ts'

import { SqliteCapacitorService } from '@/shared/capacitor/sqlite-capacitor-service.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'
import * as CapacitorProductManager from './product-manager.ts'

describe.concurrent(`Add product`, () => {
	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorService, {
				addProduct: () => Effect.succeed(undefined),
			} as unknown as SqliteCapacitorService),
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
			Layer.succeed(SqliteCapacitorService, {
				addProduct: () => Effect.fail(undefined),
			} as unknown as SqliteCapacitorService),
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
			Layer.succeed(SqliteCapacitorService, {
				addProduct: () => {
					throw new Error()
				},
			} as unknown as SqliteCapacitorService),
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
			Layer.succeed(SqliteCapacitorService, {
				deleteProductsByIds: () => Effect.succeed(undefined),
			} as unknown as SqliteCapacitorService),
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
				SqliteCapacitorService,
				{} as unknown as SqliteCapacitorService,
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
			Layer.succeed(SqliteCapacitorService, {
				deleteProductsByIds: () => Effect.fail(undefined),
			} as unknown as SqliteCapacitorService),
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
			Layer.succeed(SqliteCapacitorService, {
				deleteProductsByIds: () => {
					throw new Error()
				},
			} as unknown as SqliteCapacitorService),
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
						Layer.succeed(SqliteCapacitorService, {
							getAllProductsWithTotal: Effect.succeed(products),
						} as unknown as SqliteCapacitorService),
					),
				),
		),
	)

	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorService, {
				getAllProductsWithTotal: Effect.fail(undefined),
			} as unknown as SqliteCapacitorService),
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
