import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as Sql from 'effect/unstable/sql'

import * as GetProducts from '@/app/ports/outbound/product/get-products.ts'
import { ProductExpirationSchema, ProductSchema } from '@/infra/shared/sql/schema.ts'
import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'
import * as Integer from '@/shared/integer/integer.ts'

export const getProductsLayer = Layer.effect(
  GetProducts.GetProducts,
  Effect.gen(function*() {
    const sql = yield* Sql.SqlClient.SqlClient
    const getProducts = Sql.SqlSchema.findAll({
      Request: Schema.Void,
      Result: Schema.Struct({
        maybeCreationDate: Schema.OptionFromNullishOr(SqlHelper.Product.fields[ProductSchema.columns.creationDate]),
        maybeExpirationDate: Schema.OptionFromNullishOr(
          SqlHelper.ProductExpiration.fields[ProductExpirationSchema.columns.date],
        ),
        maybeId: Schema.OptionFromNullishOr(Integer.Schema),
        maybeName: Schema.OptionFromNullishOr(SqlHelper.Product.fields[ProductSchema.columns.name]),
      }),
      execute: () => {
        const { table: product_table, columns: product } = ProductSchema
        const { table: expiration_table, columns: expiration } = ProductExpirationSchema
        return sql`
          SELECT
              ${sql(`${product_table}.${product.id}`)} as maybeId,
              ${sql(`${product_table}.${product.name}`)} as maybeName,
              ${sql(`${product_table}.${product.creationDate}`)} as maybeCreationDate,
              ${sql(`${expiration_table}.${expiration.date}`)} as maybeExpirationDate
          FROM ${sql(product_table)}
          LEFT JOIN ${sql(expiration_table)}
              ON ${sql(`${product_table}.${product.id}`)} = ${sql(`${expiration_table}.${expiration.productId}`)}
          ${
          sql.csv('ORDER BY', [
            sql`${sql(`${expiration_table}.${expiration.date}`)} IS NULL`,
            sql`${sql(`${expiration_table}.${expiration.date}`)}`,
          ])
        }`
      },
    })()
    // @effect-diagnostics-next-line returnEffectInGen:off
    return Effect.gen(function*() {
      const maybeProducts = yield* Effect.option(getProducts)
      if (Opt.isNone(maybeProducts)) {
        return yield* Effect.fail(undefined)
      }
      type Product = (typeof maybeProducts.value)[0]
      const mapToDTO = Effect.fn(function*(product: Product) {
        return {
          ...product,
          maybeId: yield* Opt.match(product.maybeId, {
            onNone: () => Effect.succeed(Opt.none<string>()),
            onSome: (id) => Effect.option(Effect.try({ catch: () => undefined, try: () => id.toString(10) })),
          }),
        } as const
      })
      return yield* pipe(maybeProducts.value, Arr.map(mapToDTO), Effect.all)
    })
  }),
)
