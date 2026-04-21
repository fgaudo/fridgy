import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/unstable/schema'
import * as Sql from 'effect/unstable/sql'

import {
	ProductExpirationSchema,
	ProductSchema,
} from '@/infra/shared/sql/schema.ts'
import * as Integer from '@/shared/integer/integer.ts'

export class Product extends SchemaX.Model.Class<Product>('Product')({
	[ProductSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
	[ProductSchema.columns.name]: Schema.String,
	[ProductSchema.columns.creationDate]: Integer.Schema,
}) {}

export class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
	'ProductExpiration',
)({
	[ProductExpirationSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
	[ProductExpirationSchema.columns.date]: Integer.Schema,
	[ProductExpirationSchema.columns.productId]: Integer.Schema,
}) {}

export class SqlHelper extends Context.Service<SqlHelper>()(
	'ee9c8e95bb1f13c2',
	{
		make: Effect.gen(function* () {
			const sql = yield* Sql.SqlClient.SqlClient
			const productDataLoader = yield* Sql.SqlModel.makeResolvers(Product, {
				idColumn: ProductSchema.columns.id,
				spanPrefix: 'ProductDataLoader',
				tableName: ProductSchema.table,
			} as const)
			const productRepository = yield* Sql.SqlModel.makeRepository(Product, {
				idColumn: ProductSchema.columns.id,
				spanPrefix: 'ProductRepository',
				tableName: ProductSchema.table,
			} as const)
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
					creationDate: Integer.IntegerFromSelf,
					expirationDate: Integer.IntegerFromSelf,
					name: Schema.String,
				}),
				Result: Product,
				execute: flow(
					Effect.forEach(
						Effect.fn(function* (request) {
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
			return {
				insertProductWithExpirationResolver,
				productDataLoader,
				productExpirationDataLoader,
				productExpirationRepository,
				productRepository,
			}
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
