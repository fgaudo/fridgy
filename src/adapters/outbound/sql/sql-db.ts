import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/unstable/schema'
import * as Sql from 'effect/unstable/sql'

import * as Integer from '@/core/integer/integer.ts'

export const ProductSchema = {
	table: 'product',
	columns: {
		id: 'id',
		name: 'name',
		creationDate: 'creation_date',
	},
} as const

export const ProductExpirationSchema = {
	table: 'product_expiration',
	columns: {
		id: 'id',
		date: 'date',
		productId: 'product_id',
	},
} as const

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

export class SqlDb extends Context.Service<SqlDb>()('dd33f8c5cbb72f0f', {
	make: Effect.gen(function* () {
		const sql = yield* Sql.SqlClient.SqlClient
		const productDataLoader = yield* Sql.SqlModel.makeResolvers(Product, {
			tableName: ProductSchema.table,
			idColumn: ProductSchema.columns.id,
			spanPrefix: 'ProductDataLoader',
		} as const)
		const productRepository = yield* Sql.SqlModel.makeRepository(Product, {
			tableName: ProductSchema.table,
			idColumn: ProductSchema.columns.id,
			spanPrefix: 'ProductRepository',
		} as const)
		const productExpirationDataLoader = yield* Sql.SqlModel.makeResolvers(
			ProductExpiration,
			{
				tableName: ProductExpirationSchema.table,
				idColumn: ProductExpirationSchema.columns.id,
				spanPrefix: 'ProductExpirationDataLoader',
			} as const,
		)
		const productExpirationRepository = yield* Sql.SqlModel.makeRepository(
			ProductExpiration,
			{
				tableName: ProductExpirationSchema.table,
				idColumn: ProductExpirationSchema.columns.id,
				spanPrefix: 'ProductExpirationRepository',
			} as const,
		)
		const insertProductWithExpirationResolver = Sql.SqlResolver.ordered({
			Request: Schema.Struct({
				creationDate: Integer.IntegerFromSelf,
				name: Schema.String,
				expirationDate: Integer.IntegerFromSelf,
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
			productDataLoader,
			productRepository,
			productExpirationDataLoader,
			productExpirationRepository,
			insertProductWithExpirationResolver,
		}
	}),
}) {
	static layer = Layer.effect(this, this.make)
}
