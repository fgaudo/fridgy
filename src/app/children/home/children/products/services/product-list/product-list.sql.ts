import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'
import * as Stream from 'effect/Stream'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlSchema from 'effect/sql/SqlSchema'
import { ProductStore } from '#infrastructure/storage/products.ts'
import * as Source from '#libs/source/source.ts'
import { ProductList, ProductListReadError, type StoredProducts } from './product-list.ts'

export const layer = Layer.effect(
  ProductList,
  Effect.gen(function*() {
    const { withExpiration: { select, Row, readRow, from, columns, tables } } = yield* ProductStore
    const sql = yield* SqlClient.SqlClient
    /**
     * Every stored product as the snapshot it was stored from, with its id: those that expire first, the soonest
     * first. The id breaks ties, since SQLite keeps no order among equal keys and the rows would move between reads.
     */
    const readAll = SqlSchema.findAll({
      Request: Schema.Void,
      Result: Row,
      execute: () =>
        sql`
          ${select}
          ${from}
          ORDER BY ${columns.expirationDate} IS NULL, ${columns.expirationDate}, ${columns.id}
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
                Arr.map(products, (row) => {
                  const { id, snapshot } = readRow(row)
                  return { ...snapshot, id: id.toString(10) }
                }),
              ),
          })
        ),
      ),
    )
    return { changes }
  }),
).pipe(Layer.provide(ProductStore.layer))
