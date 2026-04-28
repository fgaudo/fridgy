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
        maybeCreationDate: Schema.OptionFromNullishOr(
          SqlHelper.Product.fields[ProductSchema.columns.creationDate],
        ),
        maybeExpirationDate: Schema.OptionFromNullishOr(
          SqlHelper.ProductExpiration
            .fields[ProductExpirationSchema.columns.date],
        ),
        maybeId: Schema.OptionFromNullishOr(Integer.Schema),
        maybeName: Schema.OptionFromNullishOr(
          SqlHelper.Product.fields[ProductSchema.columns.name],
        ),
      }),
      execute: () => {
        const { table: product_table, columns: product } = ProductSchema
        const { table: expiration_table, columns: expiration } = ProductExpirationSchema
        const id = sql(`${product_table}.${product.id}`)
        const name = sql(`${product_table}.${product.name}`)
        const creationDate = sql(`${product_table}.${product.creationDate}`)
        const expirationDate = sql(`${expiration_table}.${expiration.date}`)
        const productTable = sql(product_table)
        const expirationTable = sql(expiration_table)
        const productId = sql(`${expiration_table}.${expiration.productId}`)
        return sql`
          SELECT
              ${id} as maybeId,
              ${name} as maybeName,
              ${creationDate} as maybeCreationDate,
              ${expirationDate} as maybeExpirationDate
          FROM ${productTable}
          LEFT JOIN ${expirationTable}
              ON ${id} = ${productId}
          ${
          sql.csv('ORDER BY', [
            sql`${expirationDate} IS NULL`,
            sql`${expirationDate}`,
          ])
        }
          `
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
            onSome: (id) =>
              Effect.try({ catch: () => undefined, try: () => id.toString(10) })
                .pipe(Effect.option),
          }),
        } as const
      })
      return yield* pipe(maybeProducts.value, Arr.map(mapToDTO), Effect.all)
    })
  }),
)
