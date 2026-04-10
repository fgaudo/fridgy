import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/unstable/schema'
import * as Sql from 'effect/unstable/sql'

import * as Integer from '@/core/integer/integer.ts'

export const DbSchema = {
	product: {
		table: 'product',
		columns: {
			id: 'product.id',
			name: 'product.name',
			creationDate: 'product.creation_date',
		},
	},
	productExpiration: {
		table: 'product_expiration',
		columns: {
			id: 'product_expiration.id',
			date: 'product_expiration.date',
			productId: 'product_expiration.product_id',
		},
	},
} as const

export class Product extends SchemaX.Model.Class<Product>('Product')({
	id: SchemaX.Model.Generated(Integer.Schema),
	name: Schema.String,
	creationDate: Integer.Schema,
}) {}

export class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
	'ProductExpiration',
)({
	id: SchemaX.Model.Generated(Integer.Schema),
	date: Integer.Schema,
	productId: Integer.Schema,
}) {}

export class SqlDb extends Context.Service<SqlDb>()('dd33f8c5cbb72f0f', {
	make: Effect.gen(function* () {
		const sql = yield* Sql.SqlClient.SqlClient
		const productDataLoader = yield* Sql.SqlModel.makeResolvers(Product, {
			tableName: DbSchema.product.table,
			idColumn: 'id',
			spanPrefix: 'ProductDataLoader',
		} as const)
		const productRepository = yield* Sql.SqlModel.makeRepository(Product, {
			tableName: DbSchema.product.table,
			idColumn: 'id',
			spanPrefix: 'ProductRepository',
		} as const)
		const productExpirationDataLoader = yield* Sql.SqlModel.makeResolvers(
			ProductExpiration,
			{
				tableName: DbSchema.productExpiration.table,
				idColumn: 'id',
				spanPrefix: 'ProductExpirationDataLoader',
			} as const,
		)
		const productExpirationRepository = yield* Sql.SqlModel.makeRepository(
			ProductExpiration,
			{
				tableName: DbSchema.productExpiration.table,
				idColumn: 'id',
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
							creationDate: request.creationDate,
							name: request.name,
						})
						yield* productExpirationRepository.insert({
							date: request.expirationDate,
							productId: product.id,
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
