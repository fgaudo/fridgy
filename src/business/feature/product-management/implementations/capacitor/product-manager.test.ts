import { describe, effect, expect, layer } from '@effect/vitest'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as H from '@/core/test-helpers.ts'

import * as SqliteCapacitorHelper from '@/shared/capacitor/sqlite-capacitor-helper.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'
import * as CapacitorProductManager from './product-manager.ts'

describe.concurrent(`Add product`, () => {
	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper.Service, {
				addProduct: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(undefined)),
				},
				deleteProductById: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.Service

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
			Layer.succeed(SqliteCapacitorHelper.Service, {
				addProduct: {
					resolver: RequestResolver.fromEffect(() =>
						Effect.fail(new Cause.UnknownException(``)),
					),
				},
				deleteProductById: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return false`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.Service

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
			Layer.succeed(SqliteCapacitorHelper.Service, {
				addProduct: {
					resolver: RequestResolver.fromEffect(() => Effect.die(undefined)),
				},
				deleteProductById: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(ProductManager.AddProduct.Request)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductManager.Service

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
			Layer.succeed(SqliteCapacitorHelper.Service, {
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(true)),
				},
				addProduct: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.Service

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
			Layer.succeed(SqliteCapacitorHelper.Service, {
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() =>
						Effect.fail(new Cause.UnknownException(`fail`)),
					),
				},
				addProduct: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.Service

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsSuccess(exit)

				expect(exit.value.every(x => !x)).toBe(true)
			}),
		)
	})

	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper.Service, {
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.die(undefined)),
				},
				addProduct: {
					resolver: undefined,
				},
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect.prop(
			`Should either be false or crash for every call`,
			[Schema.NonEmptyArray(ProductManager.DeleteProductById.Request)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductManager.Service

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				if (Exit.isSuccess(exit)) {
					expect(exit.value.every(x => !x)).toBe(true)
				} else {
					H.assertExitIsDie(exit)
				}
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
				const { getSortedProducts } = yield* ProductManager.Service
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
						Layer.succeed(SqliteCapacitorHelper.Service, {
							deleteProductById: { resolver: undefined },
							addProduct: { resolver: undefined },
							getAllProductsWithTotal: Effect.succeed(products),
						} as unknown as SqliteCapacitorHelper.Service),
					),
				),
		),
	)

	layer(
		Layer.provide(
			CapacitorProductManager.layerWithoutDependencies,
			Layer.succeed(SqliteCapacitorHelper.Service, {
				deleteProductById: { resolver: undefined },
				addProduct: { resolver: undefined },
				getAllProductsWithTotal: Effect.fail(undefined),
			} as unknown as SqliteCapacitorHelper.Service),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { getSortedProducts } = yield* ProductManager.Service

				const exit = yield* Effect.exit(getSortedProducts)

				H.assertExitIsFailure(exit)
			}),
		)
	})
})
