import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Sql from 'effect/unstable/sql'

import * as GetProducts from '@/business/ports/get-products.ts'
import * as Integer from '@/core/integer/integer.ts'

import * as SqlDb from './sql-db.ts'

const makeGetProducts = Effect.gen(function* () {
	const sql = yield* Sql.SqlClient.SqlClient
	const getProducts = Sql.SqlSchema.findAll({
		Request: Schema.Void,
		Result: Schema.Struct({
			maybeId: Schema.OptionFromNullishOr(Integer.Schema),
			maybeName: Schema.OptionFromNullishOr(SqlDb.Product.fields['name']),
			maybeCreationDate: Schema.OptionFromNullishOr(
				SqlDb.Product.fields['creation_date'],
			),
			maybeExpirationDate: Schema.OptionFromNullishOr(
				SqlDb.ProductExpiration.fields['date'],
			),
		}),
		execute: () => {
			const { table: product_table, columns: product } = SqlDb.ProductSchema
			const { table: expiration_table, columns: expiration } =
				SqlDb.ProductExpirationSchema
			return sql`
				SELECT
						${sql(`${product_table}.${product.id}`)} as maybeId,
						${sql(`${product_table}.${product.name}`)} as maybeName,
						${sql(`${product_table}.${product.creationDate}`)} as maybeCreationDate,
						${sql(`${expiration_table}.${expiration.date}`)} as maybeExpirationDate
				FROM ${sql(product_table)}
				LEFT JOIN ${sql(expiration_table)}
						ON ${sql(`${product_table}.${product.id}`)} = ${sql(`${expiration_table}.${expiration.productId}`)}
				${sql.csv('ORDER BY', [
					sql`${sql(`${expiration_table}.${expiration.date}`)} IS NULL`,
					sql`${sql(`${expiration_table}.${expiration.date}`)}`,
				])}`
		},
	})()
	// @effect-diagnostics-next-line returnEffectInGen:off
	return Effect.gen(function* () {
		const maybeProducts = yield* Effect.option(getProducts)
		if (Option.isNone(maybeProducts)) {
			return yield* Effect.fail(undefined)
		}
		type Product = (typeof maybeProducts.value)[0]
		const mapToDTO = Effect.fn(function* (product: Product) {
			return {
				...product,
				maybeId: yield* Option.match(product.maybeId, {
					onNone: () => Effect.succeed(Option.none<string>()),
					onSome: id =>
						Effect.option(
							Effect.try({
								try: () => id.toString(10),
								catch: () => undefined,
							}),
						),
				}),
			} as const
		})
		return yield* pipe(maybeProducts.value, Arr.map(mapToDTO), Effect.all)
	})
})

export const layer = Layer.effect(GetProducts.GetProducts, makeGetProducts)
