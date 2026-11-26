// The stored products, reached without a service: the adapters' tests use them to set up and check their
// service's contract, so that no service carries reads or writes that only tests need.
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlResolver from 'effect/sql/SqlResolver'
import * as SqlSchema from 'effect/sql/SqlSchema'
import type * as Product from '#domain/product.ts'
import * as Integer from '#libs/numbers/integer.ts'
import { ProductStore } from './products.ts'
import { ProductExpirationSchema, ProductSchema } from './schema.ts'

/** Stores a product, answering with its id. */
export const insert = Effect.fnUntraced(function*(snapshot: Product.Snapshot) {
  const { insert } = yield* ProductStore
  const { id } = yield* SqlResolver.request(snapshot, insert).pipe(Effect.orDie)
  return id.toString(10)
})

/** Writes a product under an id that `insert` gave, in place of what was there. */
export const update = (id: string, snapshot: Product.Snapshot) =>
  ProductStore.use(({ update }) => update(Integer.makeUnsafe(Number(id)), snapshot)).pipe(Effect.orDie, Effect.asVoid)

/** Removes the product stored under an id that `insert` gave. */
export const remove = (id: string) =>
  ProductStore.use(({ deleteById }) => deleteById(Integer.makeUnsafe(Number(id)))).pipe(Effect.orDie)

/**
 * Stores a row that no write of the app makes, its creation date and its expiration being any text, answering
 * with its id. `None` stores no expiration.
 */
export const insertRow = Effect.fnUntraced(function*(
  row: Readonly<{ name: string; creationDate: string; maybeExpirationDate: Opt.Option<string> }>,
) {
  const sql = yield* SqlClient.SqlClient
  const { table: productTable, columns: product } = ProductSchema
  const { table: expirationTable, columns: expiration } = ProductExpirationSchema
  const { id } = yield* SqlSchema.findOne({
    Request: Schema.Void,
    Result: Schema.Struct({ id: Integer.Schema }),
    execute: () =>
      sql`
        INSERT INTO ${sql(productTable)} (${sql(product.name)}, ${sql(product.creationDate)})
        VALUES (${row.name}, ${row.creationDate})
        RETURNING ${sql(product.id)} AS id
      `,
  })().pipe(Effect.orDie)
  yield* Opt.match(row.maybeExpirationDate, {
    onNone: () => Effect.void,
    onSome: (date) =>
      sql`
        INSERT INTO ${sql(expirationTable)} (${sql(expiration.date)}, ${sql(expiration.productId)})
        VALUES (${date}, ${id})
      `.pipe(Effect.orDie, Effect.asVoid),
  })
  return id.toString(10)
})

/** What is stored under `id`, as the database holds it: nothing under an id that `insert` never gave. */
export const readBack = Effect.fnUntraced(function*(id: string) {
  const { withExpiration: { select, Row, readRow, from, columns } } = yield* ProductStore
  const sql = yield* SqlClient.SqlClient
  const rows = yield* Opt.match(Integer.make(Number(id)), {
    onNone: () => Effect.succeed([]),
    onSome: (id) =>
      SqlSchema.findAll({
        Request: Schema.Void,
        Result: Row,
        execute: () =>
          sql`
            ${select}
            ${from}
            WHERE ${columns.id} = ${id}
          `,
      })().pipe(Effect.orDie),
  })
  return Opt.map(Arr.head(rows), (row) => readRow(row).snapshot)
})

/** Everything that is stored, as the database holds it. */
export const readAll = Effect.gen(function*() {
  const { withExpiration: { select, Row, readRow, from } } = yield* ProductStore
  const sql = yield* SqlClient.SqlClient
  const rows = yield* SqlSchema.findAll({
    Request: Schema.Void,
    Result: Row,
    execute: () =>
      sql`
        ${select}
        ${from}
      `,
  })().pipe(Effect.orDie)
  return Arr.map(rows, (row) => readRow(row).snapshot)
})
