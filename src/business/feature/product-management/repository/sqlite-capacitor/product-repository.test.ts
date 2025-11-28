import { describe, effect, expect, layer } from '@effect/vitest'
import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as H from '@/core/test-helpers.ts'
import { makeTestLayer } from '@/core/testing.ts'

import * as SqliteCapacitorHelper from '@/shared/capacitor/sqlite-capacitor-helper.ts'

import * as ProductRepository from '../product-repository.ts'
import * as SqliteCapacitorProductRepository from './product-repository.ts'

class AddProductRequest extends Schema.TaggedRequest<AddProductRequest>(
	'AddProductRequest',
)('AddProductRequest', {
	failure: Schema.Never,
	success: Schema.Boolean,
	payload: {
		name: NonEmptyTrimmedString.Schema,
		maybeExpirationDate: Schema.Option(Integer.Schema),
		creationDate: Integer.Schema,
	},
}) {}

describe.concurrent(`Add product`, () => {
	layer(
		Layer.provide(
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				addProduct: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(undefined)),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(AddProductRequest)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductRepository.ProductRepository

				const exit = yield* Effect.exit(
					Effect.forEach(requests, request =>
						Effect.request(request, resolver),
					),
				)

				H.assertExitIsSuccess(exit)
				expect(exit.value.every(x => x)).toBe(true)
			}),
		)
	})

	layer(
		Layer.provide(
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				addProduct: {
					resolver: RequestResolver.fromEffect(() =>
						Effect.fail(new Cause.UnknownException(``)),
					),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return false`,
			[Schema.NonEmptyArray(AddProductRequest)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductRepository.ProductRepository

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
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				addProduct: {
					resolver: RequestResolver.fromEffect(() => Effect.die(undefined)),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should crash`,
			[Schema.NonEmptyArray(AddProductRequest)],
			Effect.fn(function* ([requests]) {
				const {
					addProduct: { resolver },
				} = yield* ProductRepository.ProductRepository

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

class DeleteProductByIdRequest extends Schema.TaggedRequest<DeleteProductByIdRequest>(
	'DeleteProductByIdRequest',
)('DeleteProductByIdRequest', {
	failure: Schema.Never,
	success: Schema.Boolean,
	payload: {
		id: Schema.String,
	},
}) {}

describe.concurrent(`Delete products by ids`, () => {
	layer(
		Layer.provide(
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.succeed(true)),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should just work`,
			[Schema.NonEmptyArray(DeleteProductByIdRequest)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductRepository.ProductRepository

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
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() =>
						Effect.fail(new Cause.UnknownException(`fail`)),
					),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should return an error`,
			[Schema.NonEmptyArray(DeleteProductByIdRequest)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductRepository.ProductRepository

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
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				deleteProductById: {
					resolver: RequestResolver.fromEffect(() => Effect.die(undefined)),
				},
			}),
		),
	)(({ effect }) => {
		effect.prop(
			`Should either be false or crash for every call`,
			[Schema.NonEmptyArray(DeleteProductByIdRequest)],
			Effect.fn(function* ([requests]) {
				const {
					deleteProductById: { resolver },
				} = yield* ProductRepository.ProductRepository

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

export const GetSortedProducts = Schema.Array(
	Schema.Struct({
		maybeId: Schema.Option(Schema.Number),
		maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		maybeExpirationDate: Schema.Option(Integer.Schema),
		maybeCreationDate: Schema.Option(Integer.Schema),
	}),
)

describe.concurrent(`Get products`, () => {
	effect.prop(
		`Should return a list`,
		[GetSortedProducts],
		Effect.fn(
			function* ([products], { expect }) {
				const { getProducts: getSortedProducts } =
					yield* ProductRepository.ProductRepository
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
						SqliteCapacitorProductRepository.layerWithoutDependencies,
						makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
							getAllProductsWithTotal: Effect.succeed(products),
						}),
					),
				),
		),
	)

	layer(
		Layer.provide(
			SqliteCapacitorProductRepository.layerWithoutDependencies,
			makeTestLayer(SqliteCapacitorHelper.SqliteCapacitorHelper)({
				getAllProductsWithTotal: Effect.fail(
					SqliteCapacitorHelper.GetAllProducts.Failed.FetchingFailed(),
				),
			}),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const { getProducts: getSortedProducts } =
					yield* ProductRepository.ProductRepository

				const exit = yield* Effect.exit(getSortedProducts)

				H.assertExitIsFailure(exit)
			}),
		)
	})
})
