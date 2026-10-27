// How products are written and read, for every adapter of the storage: how each column is encoded, the tables
// as models, the repository of products, the insertion and the deletion of a product with its expiration, and
// the join of a product to its expiration. What a query over them selects, filters and orders is the query's own.
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/schema'
import * as Sql from 'effect/sql'
import * as Integer from '#libs/numbers/integer.ts'
import { ProductExpirationSchema, ProductSchema } from './schema.ts'

/** How the values of each column are encoded: what a query decodes its rows with. */
export const ProductColumns = {
  id: Integer.Schema,
  name: Schema.String,
  creationDate: Schema.DateTimeUtcFromString,
} as const

export const ProductExpirationColumns = {
  id: Integer.Schema,
  date: Schema.DateTimeUtcFromString,
  productId: Integer.Schema,
} as const

class Product extends SchemaX.Model.Class<Product>('Product')({
  [ProductSchema.columns.id]: SchemaX.Model.Field({
    select: ProductColumns.id,
    update: ProductColumns.id,
    json: ProductColumns.id,
  }),
  [ProductSchema.columns.name]: ProductColumns.name,
  [ProductSchema.columns.creationDate]: ProductColumns.creationDate,
}) {}

class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
  'ProductExpiration',
)({
  [ProductExpirationSchema.columns.id]: SchemaX.Model.Field({
    select: ProductExpirationColumns.id,
    update: ProductExpirationColumns.id,
    json: ProductExpirationColumns.id,
  }),
  [ProductExpirationSchema.columns.date]: ProductExpirationColumns.date,
  [ProductExpirationSchema.columns.productId]: ProductExpirationColumns.productId,
}) {}

export class ProductStore extends Context.Service<ProductStore>()(
  'c28d89da81ef74f7',
  {
    make: Effect.gen(function*() {
      const sql = yield* Sql.SqlClient.SqlClient
      const repository = yield* Sql.SqlModel.makeRepository(
        Product,
        {
          idColumn: ProductSchema.columns.id,
          spanPrefix: 'ProductRepository',
          tableName: ProductSchema.table,
        } as const,
      )
      const expirations = yield* Sql.SqlModel.makeRepository(
        ProductExpiration,
        {
          idColumn: ProductExpirationSchema.columns.id,
          spanPrefix: 'ProductExpirationRepository',
          tableName: ProductExpirationSchema.table,
        } as const,
      )
      /** Inserts products, each with its expiration if it has one, in one transaction; answers with their ids. */
      const insert = Sql.SqlResolver.ordered({
        Request: Schema.Struct({
          name: Schema.String,
          creationDate: Schema.DateTimeUtc,
          maybeExpirationDate: Schema.Option(Schema.DateTimeUtc),
        }),
        // Decoded from what `execute` returns, so it must describe encoded values: only the id is needed.
        Result: Schema.Struct({ id: Integer.Schema }),
        execute: flow(
          Effect.forEach(
            Effect.fn(function*(request) {
              const product = yield* repository.insert({
                creation_date: request.creationDate,
                name: request.name,
              })
              yield* Opt.match(request.maybeExpirationDate, {
                onNone: () => Effect.void,
                onSome: (date) => Effect.asVoid(expirations.insert({ date, product_id: product.id })),
              })
              return { id: product.id }
            }),
            { concurrency: 'unbounded' },
          ),
          sql.withTransaction,
        ),
      })
      const { table: product_table, columns: product } = ProductSchema
      const { table: expiration_table, columns: expiration } = ProductExpirationSchema
      const id = sql(`${product_table}.${product.id}`)
      const name = sql(`${product_table}.${product.name}`)
      const creationDate = sql(`${product_table}.${product.creationDate}`)
      const expirationDate = sql(`${expiration_table}.${expiration.date}`)
      const productId = sql(`${expiration_table}.${expiration.productId}`)
      /** Deletes a product; the schema's trigger deletes its expiration with it (`migrations.ts`). */
      const deleteById = (id: Integer.Integer) => repository.delete(id)
      /**
       * A product with its expiration, if any, for the queries that read products: the `FROM` of a product
       * left-joined to its expiration, the columns a query may select or refer to, and the tables it reads, for a
       * query that reacts to their changes. What a query selects, filters and orders is its own.
       */
      const withExpiration = {
        from: sql`FROM ${sql(product_table)} LEFT JOIN ${sql(expiration_table)} ON ${id} = ${productId}`,
        columns: { id, name, creationDate, expirationDate },
        tables: [product_table, expiration_table],
      }
      return { insert, deleteById, withExpiration }
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
