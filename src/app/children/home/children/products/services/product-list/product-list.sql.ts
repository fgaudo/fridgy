import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlSchema from 'effect/sql/SqlSchema'
import { ProductColumns, ProductExpirationColumns, ProductStore } from '#infrastructure/storage/products.ts'
import * as Source from '#libs/source/source.ts'
import { ProductList, ProductListReadError, type StoredProducts } from './product-list.ts'

export const layer = Layer.effect(
  ProductList,
  Effect.gen(function*() {
    const { withExpiration: { from, columns, tables } } = yield* ProductStore
    const sql = yield* SqlClient.SqlClient
    /** Every stored product as the snapshot it was stored from, with its id: those that expire first, the soonest first. */
    const readAll = SqlSchema.findAll({
      Request: Schema.Void,
      Result: Schema.Struct({
        maybeId: Schema.OptionFromNullishOr(ProductColumns.id),
        maybeName: Schema.OptionFromNullishOr(ProductColumns.name),
        maybeCreationDate: Schema.OptionFromNullishOr(ProductColumns.creationDate),
        maybeExpirationDate: Schema.OptionFromNullishOr(ProductExpirationColumns.date),
      }),
      execute: () =>
        sql`
          SELECT
            ${columns.id} AS maybeId,
            ${columns.name} AS maybeName,
            ${columns.creationDate} AS maybeCreationDate,
            ${columns.expirationDate} AS maybeExpirationDate
          ${from}
          ORDER BY ${columns.expirationDate} IS NULL, ${columns.expirationDate}
        `,
    })()
    const changes = Source.fromStream(
      sql.reactive(
        tables,
        readAll.pipe(
          Effect.tapError((error) => Effect.logWarning('Could not read the products', error)),
          Effect.result,
        ),
      ).pipe(
        Stream.buffer({ capacity: 1, strategy: 'sliding' }),
        Stream.map((result): StoredProducts =>
          Result.match(result, {
            onFailure: (cause) => Result.fail(new ProductListReadError({ cause })),
            onSuccess: (products) =>
              Result.succeed(
                Arr.map(products, (product) => ({
                  ...product,
                  maybeId: Opt.map(product.maybeId, (id) => id.toString(10)),
                })),
              ),
          })
        ),
      ),
    )
    return { changes }
  }),
).pipe(Layer.provide(ProductStore.layer))
