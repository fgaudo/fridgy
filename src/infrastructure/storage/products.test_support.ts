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
import { ProductColumns, ProductExpirationColumns, ProductStore } from './products.ts'

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

/** What is stored under `id`, as the database holds it: nothing under an id that `insert` never gave. */
export const readBack = Effect.fnUntraced(function*(id: string) {
  const { withExpiration: { from, columns } } = yield* ProductStore
  const sql = yield* SqlClient.SqlClient
  const rows = yield* Opt.match(Integer.make(Number(id)), {
    onNone: () => Effect.succeed([]),
    onSome: (id) =>
      SqlSchema.findAll({
        Request: Schema.Void,
        Result: Schema.Struct({
          maybeName: Schema.OptionFromNullishOr(ProductColumns.name),
          maybeCreationDate: Schema.OptionFromNullishOr(ProductColumns.creationDate),
          maybeExpirationDate: Schema.OptionFromNullishOr(ProductExpirationColumns.date),
        }),
        execute: () =>
          sql`
            SELECT
              ${columns.name} AS maybeName,
              ${columns.creationDate} AS maybeCreationDate,
              ${columns.expirationDate} AS maybeExpirationDate
            ${from}
            WHERE ${columns.id} = ${id}
          `,
      })().pipe(Effect.orDie),
  })
  return Opt.map(Arr.head(rows), (row): Product.UnvalidatedSnapshot => row)
})

/** Everything that is stored, as the database holds it. */
export const readAll = Effect.gen(function*() {
  const { withExpiration: { from, columns } } = yield* ProductStore
  const sql = yield* SqlClient.SqlClient
  const rows = yield* SqlSchema.findAll({
    Request: Schema.Void,
    Result: Schema.Struct({
      maybeName: Schema.OptionFromNullishOr(ProductColumns.name),
      maybeCreationDate: Schema.OptionFromNullishOr(ProductColumns.creationDate),
      maybeExpirationDate: Schema.OptionFromNullishOr(ProductExpirationColumns.date),
    }),
    execute: () =>
      sql`
        SELECT
          ${columns.name} AS maybeName,
          ${columns.creationDate} AS maybeCreationDate,
          ${columns.expirationDate} AS maybeExpirationDate
        ${from}
      `,
  })().pipe(Effect.orDie)
  return Arr.map(rows, (row): Product.UnvalidatedSnapshot => row)
})
