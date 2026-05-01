import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/unstable/schema'
import * as Sql from 'effect/unstable/sql'
import { ProductExpirationSchema, ProductSchema } from '@/infra/shared/sql/schema.ts'
import * as Integer from '@/shared/integer/integer.ts'

export class Product extends SchemaX.Model.Class<Product>('Product')({
  [ProductSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
  [ProductSchema.columns.name]: Schema.String,
  [ProductSchema.columns.creationDate]: Schema.DateTimeUtcFromString,
}) {}

export class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
  'ProductExpiration',
)({
  [ProductExpirationSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
  [ProductExpirationSchema.columns.date]: Schema.DateTimeUtcFromString,
  [ProductExpirationSchema.columns.productId]: Integer.Schema,
}) {}

export class SqlHelper extends Context.Service<SqlHelper>()(
  'ee9c8e95bb1f13c2',
  {
    make: Effect.gen(function*() {
      const sql = yield* Sql.SqlClient.SqlClient
      const productDataLoader = yield* Sql.SqlModel.makeResolvers(
        Product,
        {
          idColumn: ProductSchema.columns.id,
          spanPrefix: 'ProductDataLoader',
          tableName: ProductSchema.table,
        } as const,
      )
      const productRepository = yield* Sql.SqlModel.makeRepository(
        Product,
        {
          idColumn: ProductSchema.columns.id,
          spanPrefix: 'ProductRepository',
          tableName: ProductSchema.table,
        } as const,
      )
      const productExpirationDataLoader = yield* Sql.SqlModel.makeResolvers(
        ProductExpiration,
        {
          idColumn: ProductExpirationSchema.columns.id,
          spanPrefix: 'ProductExpirationDataLoader',
          tableName: ProductExpirationSchema.table,
        } as const,
      )
      const productExpirationRepository = yield* Sql.SqlModel.makeRepository(
        ProductExpiration,
        {
          idColumn: ProductExpirationSchema.columns.id,
          spanPrefix: 'ProductExpirationRepository',
          tableName: ProductExpirationSchema.table,
        } as const,
      )
      const insertProductWithExpirationResolver = Sql.SqlResolver.ordered({
        Request: Schema.Struct({
          creationDate: Schema.DateTimeUtc,
          expirationDate: Schema.DateTimeUtc,
          name: Schema.String,
        }),
        Result: Product,
        execute: flow(
          Effect.forEach(
            Effect.fn(function*(request) {
              const product = yield* productRepository.insert({
                creation_date: request.creationDate,
                name: request.name,
              })
              yield* productExpirationRepository.insert({
                date: request.expirationDate,
                product_id: product.id,
              })
              return product
            }),
            { concurrency: 'unbounded' },
          ),
          sql.withTransaction,
        ),
      })

      const getProducts = Sql.SqlSchema.findAll({
        Request: Schema.Void,
        Result: Schema.Struct({
          maybeCreationDate: Schema.OptionFromNullishOr(
            Product.fields[ProductSchema.columns.creationDate],
          ),
          maybeExpirationDate: Schema.OptionFromNullishOr(
            ProductExpiration
              .fields[ProductExpirationSchema.columns.date],
          ),
          maybeId: Schema.OptionFromNullishOr(Integer.Schema),
          maybeName: Schema.OptionFromNullishOr(
            Product.fields[ProductSchema.columns.name],
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
      return {
        insertProductWithExpirationResolver,
        productDataLoader,
        productExpirationDataLoader,
        productExpirationRepository,
        productRepository,
        getProducts,
      }
    }),
  },
) {
  static layer = Layer.effect(this, this.make)
}
