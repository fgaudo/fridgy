// What the store's test needs of the stored products beyond the store: a row that no write of the app makes, and
// writes that the storage refuses. No service carries reads or writes that only tests need.
import * as Brand from 'effect/Brand'
import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as SqlClient from 'effect/sql/SqlClient'
import * as SqlSchema from 'effect/sql/SqlSchema'
import type * as Domain from '#domain/product.ts'
import * as Integer from '#libs/numbers/integer.ts'
import { ProductExpirationSchema, ProductSchema } from './schema.ts'

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
  return Brand.nominal<Domain.ProductId>()(id)
})

/**
 * From now on, the storage refuses to write an expiration for a product named `name`, and to delete such a
 * product: the statement fails, and with it the write it is part of. A product's own row is still written, so that
 * a write left half done would show.
 */
export const refuseWritesOf = Effect.fnUntraced(function*(name: string) {
  const sql = yield* SqlClient.SqlClient
  const { table: productTable, columns: product } = ProductSchema
  const { table: expirationTable, columns: expiration } = ProductExpirationSchema
  // A trigger takes no bound parameter: the name is a literal.
  const literal = `'${name.replaceAll('\'', '\'\'')}'`
  const nameOf = (row: 'NEW' | 'OLD') =>
    `(SELECT ${product.name} FROM ${productTable} WHERE ${product.id} = ${row}.${expiration.productId})`
  const refuse = `BEGIN SELECT RAISE(ABORT, 'refused by the test'); END`
  yield* Effect.forEach(
    [
      `CREATE TRIGGER refuse_expiration_insert BEFORE INSERT ON ${expirationTable}
      WHEN ${nameOf('NEW')} = ${literal} ${refuse}`,
      `CREATE TRIGGER refuse_expiration_update BEFORE UPDATE ON ${expirationTable}
      WHEN ${nameOf('NEW')} = ${literal} ${refuse}`,
      `CREATE TRIGGER refuse_expiration_delete BEFORE DELETE ON ${expirationTable}
      WHEN ${nameOf('OLD')} = ${literal} ${refuse}`,
      `CREATE TRIGGER refuse_product_delete BEFORE DELETE ON ${productTable}
      WHEN OLD.${product.name} = ${literal} ${refuse}`,
    ],
    (statement) => sql.unsafe(statement),
    { discard: true },
  ).pipe(Effect.orDie)
})
