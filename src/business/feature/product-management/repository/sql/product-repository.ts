import * as Sql from '@effect/sql'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import { OptionFromValue } from '@/core/schema.ts'

import * as SqlDb from '@/shared/sql/sql-db.ts'

import * as ProductRepository from '../product-repository.ts'

const makeGetProducts = Effect.gen(function* () {
	const sql = yield* Sql.SqlClient.SqlClient
	const makeSelectProducts = Sql.SqlSchema.findAll({
		Request: Schema.Void,
		Result: Schema.Struct({
			maybeId: OptionFromValue(Integer.Schema).annotations({
				decodingFallback: Effect.fnUntraced(function* () {
					return Option.none()
				}),
			}),
			maybeName: OptionFromValue(SqlDb.Product.fields.name).annotations({
				decodingFallback: Effect.fnUntraced(function* () {
					return Option.none()
				}),
			}),
			maybeCreationDate: OptionFromValue(
				SqlDb.Product.fields.creationDate,
			).annotations({
				decodingFallback: Effect.fnUntraced(function* () {
					return Option.none()
				}),
			}),
			maybeExpirationDate: OptionFromValue(
				SqlDb.ProductExpiration.fields.date,
			).annotations({
				decodingFallback: Effect.fnUntraced(function* () {
					return Option.none()
				}),
			}),
		}),
		execute: () => {
			const { table: product_table, columns: product } = SqlDb.DbSchema.product
			const { table: expiration_table, columns: expiration } =
				SqlDb.DbSchema.productExpiration

			return sql`
				SELECT 
					${sql(product.id)} as maybeId,
					${sql(product.name)} as maybeName, 
					${sql(product.creationDate)} as maybeCreationDate,
					${sql(expiration.date)} as maybeExpirationDate
				FROM ${sql(product_table)}
				LEFT JOIN ${sql(expiration_table)}
					ON ${sql(product.id)} = ${sql(expiration.id)}
				ORDER BY
					${sql(expiration.date)} IS NULL, ${sql(expiration.date)}
			`
		},
	})()

	return Effect.gen(function* () {
		const maybeProducts = yield* Effect.option(makeSelectProducts)

		if (Option.isNone(maybeProducts)) {
			return yield* Effect.fail(undefined)
		}

		const arr = yield* pipe(
			maybeProducts.value,
			Arr.map(
				Effect.fn(function* (product) {
					return {
						...product,
						maybeId: yield* Option.match(product.maybeId, {
							onNone: () => Effect.succeed(Option.none<string>()),
							onSome: id => Effect.option(Effect.try(() => id.toString(10))),
						}),
					} as const
				}),
			),
			Effect.all,
		)

		return Arr.isNonEmptyReadonlyArray(arr) ? Option.some(arr) : Option.none()
	})
})

const makeDeleteResolver = Effect.gen(function* () {
	const { productDataLoader } = yield* SqlDb.SqlDb

	return RequestResolver.makeBatched<
		ProductRepository.DeleteProductById['Request'],
		never
	>(requests =>
		pipe(
			requests,
			Effect.forEach(
				Effect.fn(function* (request) {
					const parsed = yield* pipe(
						Effect.try(() => JSON.parse(request.id) as unknown),
						Effect.option,
						Effect.map(
							Option.filter(
								id => typeof id === 'number' && Integer.isInteger(id),
							),
						),
					)

					if (Option.isNone(parsed)) {
						yield* Effect.logWarning('Id has incorrect format. Skipping.').pipe(
							Effect.annotateLogs({ id: request.id }),
						)
						return yield* Effect.fail(undefined)
					}

					const result = yield* Effect.option(
						productDataLoader.delete(SqlDb.ProductId.make(parsed.value)),
					)

					if (Option.isNone(result)) {
						return yield* Effect.fail(undefined)
					}

					yield* Effect.logDebug('Product deleted from sqlite database')
				}),
				{ batching: true },
			),
			Effect.matchCauseEffect({
				onFailure: cause => Effect.forEach(requests, Request.failCause(cause)),
				onSuccess: result =>
					Effect.forEach(requests, (request, index) =>
						Request.succeed(request, result[index]!),
					),
			}),
		),
	)
})

const makeAddProductResolver = Effect.gen(function* () {
	const { productDataLoader, insertProductWithExpirationResolver } =
		yield* SqlDb.SqlDb

	return RequestResolver.makeBatched<
		ProductRepository.AddProduct['Request'],
		never
	>(requests =>
		pipe(
			requests,
			Effect.forEach(
				Effect.fn(function* (request) {
					if (Option.isNone(request.maybeExpirationDate)) {
						const maybeProduct = yield* Effect.option(
							productDataLoader.insert({
								name: request.name,
								creationDate: request.creationDate,
							}),
						)

						if (Option.isNone(maybeProduct)) {
							return yield* Effect.fail(undefined)
						}

						return maybeProduct.value.id.toString(10)
					}

					const maybeProduct = yield* Effect.option(
						insertProductWithExpirationResolver.execute({
							name: request.name,
							creationDate: request.creationDate,
							expirationDate: request.maybeExpirationDate.value,
						}),
					)

					if (Option.isNone(maybeProduct)) {
						return yield* Effect.fail(undefined)
					}

					return maybeProduct.value.id.toString(10)
				}),
				{ batching: true },
			),
			Effect.matchCauseEffect({
				onFailure: cause => Effect.forEach(requests, Request.failCause(cause)),
				onSuccess: result =>
					Effect.forEach(requests, (request, index) =>
						Request.succeed(request, result[index]!),
					),
			}),
		),
	)
})

export const layerWithoutDependencies = Layer.effect(
	ProductRepository.ProductRepository,
	Effect.gen(function* () {
		return {
			addProductResolver: yield* makeAddProductResolver,
			deleteProductByIdResolver: yield* makeDeleteResolver,
			getProducts: yield* makeGetProducts,
		}
	}),
)

export const layer = Layer.provide(
	layerWithoutDependencies,
	SqlDb.SqlDb.Default,
)
