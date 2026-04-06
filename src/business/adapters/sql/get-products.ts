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
			maybeName: Schema.OptionFromNullishOr(SqlDb.Product.fields.name),
			maybeCreationDate: Schema.OptionFromNullishOr(
				SqlDb.Product.fields.creationDate,
			),
			maybeExpirationDate: Schema.OptionFromNullishOr(
				SqlDb.ProductExpiration.fields.date,
			),
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
