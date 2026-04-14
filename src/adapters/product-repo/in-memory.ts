import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as Ref from 'effect/Ref'
import * as RequestResolver from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'
import * as AddProduct from '@/ports/outbound/add-product.ts'
import * as DeleteProductById from '@/ports/outbound/delete-product-by-id.ts'
import * as GetProducts from '@/ports/outbound/get-products.ts'

type Product = Readonly<{
	id: Integer.Integer
	name: string
	maybeExpirationDate: Opt.Option<Integer.Integer>
	creationDate: Integer.Integer
}>

class InMemoryDb extends Context.Service<InMemoryDb>()('50e09d5fe88d237e', {
	make: Effect.gen(function* () {
		const ref = yield* Ref.make({
			lastIndex: Integer.fromNumberUnsafe(0),
			map: HashMap.empty<Integer.Integer, Product>(),
		})
		return {
			products: Effect.gen(function* () {
				const { map } = yield* Ref.get(ref)
				const arr = HashMap.toValues(map)
				return arr
			}),
			deleteProductById: Effect.fn(function* (id: Integer.Integer) {
				return yield* Ref.update(ref, dbValues => ({
					...dbValues,
					map: HashMap.remove(dbValues.map, id),
				}))
			}),
			addProduct: Effect.fn(function* (product: Product) {
				const { lastIndex } = yield* Ref.updateAndGet(ref, dbValues => {
					const nextIndex = Integer.fromNumberUnsafe(dbValues.lastIndex + 1)
					return {
						...dbValues,
						lastIndex: nextIndex,
						map: dbValues.map.pipe(
							HashMap.set(nextIndex, {
								name: product.name,
								maybeExpirationDate: product.maybeExpirationDate,
								creationDate: product.creationDate,
								id: nextIndex,
							}),
						),
					}
				})
				return lastIndex
			}),
		}
	}),
}) {
	static layer = Layer.effect(this, this.make)
}

const addProductResolverLayer = Layer.effect(
	AddProduct.AddProduct,
	Effect.gen(function* () {
		const db = yield* InMemoryDb
		return RequestResolver.fromEffect<AddProduct.Request>(
			Effect.fn(function* ({ request }) {
				return (yield* db.addProduct({
					id: Integer.fromNumberUnsafe(3),
					...request.product,
				})).toString(10)
			}),
		)
	}),
)

const deleteResolverLayer = Layer.effect(
	DeleteProductById.DeleteProductById,
	Effect.gen(function* () {
		const db = yield* InMemoryDb
		return RequestResolver.fromEffect<DeleteProductById.Request>(
			Effect.fn(function* (request) {
				const maybeId = pipe(
					Number.parseInt(request.request.id, 10),
					Integer.fromNumber,
				)
				if (Opt.isNone(maybeId)) {
					return yield* Effect.fail('Invalid id supplied')
				}
				return yield* db.deleteProductById(maybeId.value)
			}),
		)
	}),
)

const getProductsLayer = Layer.effect(
	GetProducts.GetProducts,
	Effect.gen(function* () {
		const db = yield* InMemoryDb
		// @effect-diagnostics-next-line returnEffectInGen:off
		return Effect.gen(function* () {
			const map = yield* db.products
			const result = pipe(
				map,
				Arr.map(({ id, ...product }) => ({
					maybeName: Opt.some(product.name),
					maybeId: Opt.some(id.toString(10)),
					maybeCreationDate: Opt.some(product.creationDate),
					maybeExpirationDate: product.maybeExpirationDate,
				})),
			)
			return result
		})
	}),
)

export const layer = Layer.mergeAll(
	addProductResolverLayer,
	deleteResolverLayer,
	getProductsLayer,
).pipe(Layer.provide(InMemoryDb.layer))
