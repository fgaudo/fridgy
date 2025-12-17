import * as Sql from '@effect/sql'
import * as Effect from 'effect/Effect'
import { flow } from 'effect/Function'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

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

export const ProductId = Integer.Schema.pipe(Schema.brand('ProductId'))

export class Product extends Sql.Model.Class<Product>('Product')({
	id: Sql.Model.Generated(ProductId),
	name: NonEmptyTrimmedString.Schema,
	creationDate: Integer.Schema,
}) {}

export const ProductExpirationId = Schema.Number.pipe(
	Schema.brand('ProductExpirationId'),
)

export class ProductExpiration extends Sql.Model.Class<ProductExpiration>(
	'ProductExpiration',
)({
	id: Sql.Model.Generated(ProductExpirationId),
	date: Integer.Schema,
	productId: ProductId,
}) {}

///////////
///////////

export class SqlDb extends Effect.Service<SqlDb>()('e37d576c27abb171', {
	scoped: Effect.gen(function* () {
		const sql = yield* Sql.SqlClient.SqlClient

		const productDataLoader = yield* Sql.Model.makeDataLoaders(Product, {
			tableName: DbSchema.product.table,
			idColumn: 'id',
			window: '1 second',
			spanPrefix: 'ProductDataLoader',
		} as const)

		const productRepository = yield* Sql.Model.makeRepository(Product, {
			tableName: DbSchema.product.table,
			idColumn: 'id',
			spanPrefix: 'ProductRepository',
		} as const)

		const productExpirationDataLoader = yield* Sql.Model.makeDataLoaders(
			ProductExpiration,
			{
				tableName: DbSchema.productExpiration.table,
				idColumn: 'id',
				window: '1 second',
				spanPrefix: 'ProductExpirationDataLoader',
			} as const,
		)

		const productExpirationRepository = yield* Sql.Model.makeRepository(
			ProductExpiration,
			{
				tableName: DbSchema.productExpiration.table,
				idColumn: 'id',
				spanPrefix: 'ProductExpirationRepository',
			} as const,
		)

		const insertProductWithExpirationResolver = yield* Sql.SqlResolver.ordered(
			'InsertProductWithExpiration',
			{
				Request: Schema.Struct({
					creationDate: Integer.IntegerFromSelf,
					name: NonEmptyTrimmedString.NonEmptyTrimmedStringFromSelf,
					expirationDate: Integer.IntegerFromSelf,
				}),
				Result: Product,
				execute: flow(
					Effect.forEach(
						Effect.fn(function* (request) {
							const product = yield* productDataLoader.insert({
								creationDate: request.creationDate,
								name: request.name,
							})

							yield* productExpirationDataLoader.insert({
								date: request.expirationDate,
								productId: product.id,
							})

							return product
						}),
						{ batching: true },
					),
					sql.withTransaction,
				),
			},
		)

		return {
			productDataLoader,
			productRepository,
			productExpirationDataLoader,
			productExpirationRepository,
			insertProductWithExpirationResolver,
		}
	}),
}) {}
