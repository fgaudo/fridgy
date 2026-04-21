import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'
import * as Sql from 'effect/unstable/sql'
import * as SqlResolver from 'effect/unstable/sql/SqlResolver'

import * as AddProduct from '@/app/ports/outbound/product/add-product.ts'
import * as DeleteProductById from '@/app/ports/outbound/product/delete-product-by-id.ts'
import * as GetProducts from '@/app/ports/outbound/product/get-products.ts'
import {
	ProductExpirationSchema,
	ProductSchema,
} from '@/infra/shared/sql/schema.ts'
import {
	Product,
	ProductExpiration,
	SqlHelper,
} from '@/infra/shared/sql/sql-helper.ts'
import * as Integer from '@/shared/integer/integer.ts'

const addProductLayer = Layer.effect(
	AddProduct.AddProduct,
	Effect.gen(function* () {
		const { productRepository, insertProductWithExpirationResolver } =
			yield* SqlHelper
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

const deleteProductsLayer = Layer.effect(
	DeleteProductById.DeleteProductById,
	Effect.gen(function* () {
		const { productRepository } = yield* SqlHelper
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

const getProductsLayer = Layer.effect(
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

export const layer = Layer.mergeAll(
	addProductLayer,
	deleteProductsLayer,
	getProductsLayer,
)
