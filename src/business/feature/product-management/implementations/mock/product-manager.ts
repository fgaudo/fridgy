import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'
import * as Ref from 'effect/Ref'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import { Config } from '@/feature/product-management/implementations/mock/config.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'

type ProductDTO = ProductManager.GetSortedProducts[`DTO`][0]
type GetSortedProductsDTO = ProductManager.GetSortedProducts[`DTO`]

const ord = Order.make(
	Order.combineAll([
		pipe(
			Order.number,
			Order.reverse,
			Option.getOrder,
			Order.reverse,
			Order.mapInput((product: ProductDTO) => product.maybeExpirationDate),
		),
		pipe(
			Order.string,
			Option.getOrder,
			Order.mapInput((product: ProductDTO) => product.maybeName),
		),
	]),
)

export const layerWithoutDependencies = Layer.effect(
	ProductManager.ProductManager,
	Effect.gen(function* () {
		const { withErrors } = yield* Config

		const ref = yield* Ref.make({
			index: 0,
			map: HashMap.empty<string, ProductDTO>(),
		})

		return {
			getSortedProducts: Effect.gen(function* () {
				if (withErrors && Math.random() < 0.5)
					return yield* Effect.fail(undefined)

				const map = yield* Ref.get(ref).pipe(Effect.map(({ map }) => map))

				const products: GetSortedProductsDTO = map.pipe(HashMap.toValues)

				return Arr.sort(products, ord)
			}),
			deleteProductById: {
				resolver: RequestResolver.makeBatched<
					ProductManager.DeleteProductById[`Request`],
					never
				>(
					Effect.fn(
						function* (requests) {
							if (withErrors && Math.random() < 0.5) {
								return yield* Effect.fail(undefined)
							}
							yield* Effect.sleep(`200 millis`)
							for (const request of requests) {
								yield* Ref.update(ref, dbValues => ({
									...dbValues,
									map: HashMap.remove(dbValues.map, request.id),
								}))
							}
						},
						(effect, requests) =>
							Effect.matchCauseEffect(effect, {
								onFailure: Effect.fn(error =>
									Effect.forEach(requests, Request.failCause(error)),
								),
								onSuccess: Effect.fn(() =>
									Effect.forEach(requests, Request.succeed(undefined)),
								),
							}),
					),
				),
			},
			addProduct: {
				resolver: RequestResolver.fromEffect<
					never,
					ProductManager.AddProduct[`Request`]
				>(
					Effect.fn(function* (product) {
						if (withErrors && Math.random() < 0.5) {
							yield* Effect.logInfo(`Triggered fake error on mock AddProduct`)
							return yield* Effect.fail(undefined)
						}

						yield* Effect.log(`Attempting to add product into mock database...`)

						yield* Ref.update(ref, dbValues => {
							const index = dbValues.index + 1
							const indexString = index.toString(10)
							return {
								...dbValues,
								index,
								map: dbValues.map.pipe(
									HashMap.set(indexString, {
										maybeName: Option.some(product.name),
										maybeExpirationDate: product.maybeExpirationDate,
										maybeCreationDate: Option.some(product.creationDate),
										maybeId: Option.some(indexString),
									}),
								),
							}
						})

						yield* Effect.log(
							`Added product ${product.name} into mock database`,
						)

						return yield* Effect.void
					}),
				),
			},
		}
	}),
)
