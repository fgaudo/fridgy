// Append-only once released: a phone has already run the existing migrations, so a fix is a new one.
import * as Effect from 'effect/Effect'
import * as Sql from 'effect/sql'
import { ProductExpirationSchema, ProductSchema, SettingSchema } from './schema.ts'

export const migrations = {
  // Dates are ISO 8601 strings (`DateTimeUtcFromString` in `products.ts`), which order as text. The trigger, not
  // a cascade, deletes a product's expiration with it: SQLite enforces foreign keys, and their actions, only on a
  // connection that asked for them with a pragma, which the clients give no way to do; the key is a declaration.
  '0000001_create_db': Effect.gen(function*() {
    const sql = yield* Sql.SqlClient.SqlClient
    yield* sql.withTransaction(
      Effect.gen(function*() {
        const product = ProductSchema
        const expiration = ProductExpirationSchema
        const setting = SettingSchema
        const productId = sql(product.columns.id)
        yield* sql`
          CREATE TABLE ${sql(setting.table)}(
            ${sql(setting.columns.key)} TEXT PRIMARY KEY,
            ${sql(setting.columns.value)} TEXT NOT NULL
          );
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
          );
          CREATE TRIGGER delete_expiration_with_product AFTER DELETE ON ${sql(product.table)}
          BEGIN
            DELETE FROM ${sql(expiration.table)} WHERE ${sql(expiration.columns.productId)} = OLD.${productId};
          END;
        `
      }),
    )
  }),
}
