import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { flow, pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'
import * as SchemaX from 'effect/unstable/schema'
import * as Sql from 'effect/unstable/sql'
import * as SqlResolver from 'effect/unstable/sql/SqlResolver'

import * as Integer from '@/core/integer/integer.ts'
import * as AddProduct from '@/ports/outbound/add-product.ts'
import * as DeleteProductById from '@/ports/outbound/delete-product-by-id.ts'
import * as GetProducts from '@/ports/outbound/get-products.ts'

const ProductSchema = {
	table: 'product',
	columns: {
		id: 'id',
		name: 'name',
		creationDate: 'creation_date',
	},
} as const

const ProductExpirationSchema = {
	table: 'product_expiration',
	columns: {
		id: 'id',
		date: 'date',
		productId: 'product_id',
	},
} as const

class Product extends SchemaX.Model.Class<Product>('Product')({
	[ProductSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
	[ProductSchema.columns.name]: Schema.String,
	[ProductSchema.columns.creationDate]: Integer.Schema,
}) {}

class ProductExpiration extends SchemaX.Model.Class<ProductExpiration>(
	'ProductExpiration',
)({
	[ProductExpirationSchema.columns.id]: SchemaX.Model.Generated(Integer.Schema),
	[ProductExpirationSchema.columns.date]: Integer.Schema,
	[ProductExpirationSchema.columns.productId]: Integer.Schema,
}) {}

class SqlDb extends Context.Service<SqlDb>()('2c19025a677f99b3', {
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

const addProductLayer = Layer.effect(
	AddProduct.AddProduct,
	Effect.gen(function* () {
		const { productRepository, insertProductWithExpirationResolver } =
			yield* SqlDb
		return RequestResolver.makeGrouped<
			AddProduct.Request,
			Opt.Option<Integer.Integer>
		>({
			key: entry => entry.request.product.maybeExpirationDate,
			resolver: Effect.fn(function* (entries, maybeExpirationDate) {
				const maybeProducts = yield* pipe(
					entries,
					Opt.isNone(maybeExpirationDate)
						? Effect.forEach(entry =>
								productRepository.insert({
									name: entry.request.product.name,
									creation_date: entry.request.product.creationDate,
								}),
							)
						: Effect.forEach(entry =>
								SqlResolver.request(
									{
										name: entry.request.product.name,
										creationDate: entry.request.product.creationDate,
										expirationDate: maybeExpirationDate.value,
									},
									insertProductWithExpirationResolver,
								),
							),
					Effect.option,
				)
				if (Opt.isNone(maybeProducts)) {
					return yield* Effect.forEach(entries, Request.fail(undefined))
				}
				return yield* Effect.forEach(entries, (entry, index) =>
					Request.succeed(entry, maybeProducts.value[index]!.id.toString(10)),
				)
			}),
		})
	}),
)

const getProductLayer = Layer.effect(
	GetProducts.GetProducts,
	Effect.gen(function* () {
		const sql = yield* Sql.SqlClient.SqlClient
		const getProducts = Sql.SqlSchema.findAll({
			Request: Schema.Void,
			Result: Schema.Struct({
				maybeId: Schema.OptionFromNullishOr(Integer.Schema),
				maybeName: Schema.OptionFromNullishOr(Product.fields['name']),
				maybeCreationDate: Schema.OptionFromNullishOr(
					Product.fields['creation_date'],
				),
				maybeExpirationDate: Schema.OptionFromNullishOr(
					ProductExpiration.fields['date'],
				),
			}),
			execute: () => {
				const { table: product_table, columns: product } = ProductSchema
				const { table: expiration_table, columns: expiration } =
					ProductExpirationSchema
				return sql`
          SELECT
              ${sql(`${product_table}.${product.id}`)} as maybeId,
              ${sql(`${product_table}.${product.name}`)} as maybeName,
              ${sql(`${product_table}.${product.creationDate}`)} as maybeCreationDate,
              ${sql(`${expiration_table}.${expiration.date}`)} as maybeExpirationDate
          FROM ${sql(product_table)}
          LEFT JOIN ${sql(expiration_table)}
              ON ${sql(`${product_table}.${product.id}`)} = ${sql(`${expiration_table}.${expiration.productId}`)}
          ${sql.csv('ORDER BY', [
						sql`${sql(`${expiration_table}.${expiration.date}`)} IS NULL`,
						sql`${sql(`${expiration_table}.${expiration.date}`)}`,
					])}`
			},
		})()
		// @effect-diagnostics-next-line returnEffectInGen:off
		return Effect.gen(function* () {
			const maybeProducts = yield* Effect.option(getProducts)
			if (Opt.isNone(maybeProducts)) {
				return yield* Effect.fail(undefined)
			}
			type Product = (typeof maybeProducts.value)[0]
			const mapToDTO = Effect.fn(function* (product: Product) {
				return {
					...product,
					maybeId: yield* Opt.match(product.maybeId, {
						onNone: () => Effect.succeed(Opt.none<string>()),
						onSome: id =>
							Effect.option(
								Effect.try({
									try: () => id.toString(10),
									catch: () => undefined,
								}),
							),
					}),
				} as const
			})
			return yield* pipe(maybeProducts.value, Arr.map(mapToDTO), Effect.all)
		})
	}),
)

const deleteProductByIdLayer = Layer.effect(
	DeleteProductById.DeleteProductById,
	Effect.gen(function* () {
		const { productRepository } = yield* SqlDb
		return RequestResolver.make<DeleteProductById.Request>(
			Effect.fn(function* (entries) {
				const validEntries = pipe(
					entries,
					Arr.map(entry =>
						pipe(
							Number.parseInt(entry.request.id, 10),
							Integer.fromNumber,
							Opt.map(id => [entry, id] as const),
						),
					),
					Arr.filter(maybeEntry => Opt.isSome(maybeEntry)),
				)
				const maybeIds = yield* pipe(
					validEntries,
					Effect.forEach(maybeEntry =>
						productRepository.delete(maybeEntry.value[1]),
					),
					Effect.option,
				)
				if (Opt.isNone(maybeIds)) {
					return yield* Effect.forEach(validEntries, entry =>
						Request.fail(entry.value[0], undefined),
					)
				}
				return yield* Effect.forEach(validEntries, entry =>
					Request.succeed(entry.value[0], undefined),
				)
			}),
		)
	}),
)

export const layer = Layer.mergeAll(
	addProductLayer,
	deleteProductByIdLayer,
	getProductLayer,
).pipe(Layer.provide(SqlDb.layer))

export const migrations = {
	'0000001_create_db': Effect.gen(function* () {
		const sql = yield* Sql.SqlClient.SqlClient
		yield* sql.withTransaction(
			Effect.gen(function* () {
				const product = ProductSchema
				const expiration = ProductExpirationSchema
				yield* sql`
          CREATE TABLE ${sql(product.table)}(
            ${sql(product.columns.id)} INT PRIMARY KEY,
            ${sql(product.columns.name)} VARCHAR(255) NOT NULL,
            ${sql(product.columns.creationDate)} INT NOT NULL
          );
          CREATE TABLE ${sql(expiration.table)}(
            ${sql(expiration.columns.id)} INT PRIMARY KEY,
            ${sql(expiration.columns.date)} INT NOT NULL,
            ${sql(expiration.columns.productId)} INT NOT NULL,
            FOREIGN KEY(${sql(expiration.columns.productId)})
                REFERENCES ${sql(product.table)}(${sql(product.columns.id)})
                ON DELETE CASCADE
          );
        `
			}),
		)
	}),
}
