// Append-only once released: a phone has already run the existing migrations, so a fix is a new one.
import * as Effect from 'effect/Effect'
import * as Sql from 'effect/sql'
import { ProductExpirationSchema, ProductSchema } from './schema.ts'

export const migrations = {
  // Dates are ISO 8601 strings (`DateTimeUtcFromString` in `products.ts`), which order as text. The cascade is
  // declared, but not relied upon: SQLite enforces it only when a pragma asks on each connection (`products.ts`).
  '0000001_create_db': Effect.gen(function*() {
    const sql = yield* Sql.SqlClient.SqlClient
    yield* sql.withTransaction(
      Effect.gen(function*() {
        const product = ProductSchema
        const expiration = ProductExpirationSchema
        yield* sql`
          CREATE TABLE ${sql(product.table)}(
            ${sql(product.columns.id)} INTEGER PRIMARY KEY,
            ${sql(product.columns.name)} VARCHAR(255) NOT NULL,
            ${sql(product.columns.creationDate)} TEXT NOT NULL
          );
          CREATE TABLE ${sql(expiration.table)}(
            ${sql(expiration.columns.id)} INTEGER PRIMARY KEY,
            ${sql(expiration.columns.date)} TEXT NOT NULL,
            ${sql(expiration.columns.productId)} INT NOT NULL UNIQUE,
            FOREIGN KEY(${sql(expiration.columns.productId)})
                REFERENCES ${sql(product.table)}(${sql(product.columns.id)})
                ON DELETE CASCADE
          );
        `
      }),
    )
  }),
}
