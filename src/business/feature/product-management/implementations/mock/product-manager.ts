import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'
import * as Random from 'effect/Random'
import * as Ref from 'effect/Ref'
import * as RequestResolver from 'effect/RequestResolver'

import * as Config from '@/feature/product-management/implementations/mock/config.ts'

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
	ProductManager.Service,
	Effect.gen(function* () {
		const { withErrors } = yield* Config.Service

		const ref = yield* Ref.make({
			index: 0,
			map: HashMap.empty<string, ProductDTO>(),
		})

		return {
			addProduct: {
				resolver: RequestResolver.fromEffect<
					never,
					ProductManager.AddProduct[`Request`]
				>(
					Effect.fn(function* (product) {
						const isAnError =
							withErrors && (yield* Random.nextRange(0, 1)) < 0.5

						if (isAnError) {
							yield* Effect.logInfo(`Triggered fake error on mock AddProduct`)
							return yield* Effect.succeed(false)
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
										maybeCreationDate: Option.some(product.creationDate),
										maybeExpirationDate: product.maybeExpirationDate,
										maybeId: Option.some(indexString),
										maybeName: Option.some(product.name),
									}),
								),
							}
						})

						yield* Effect.log(
							`Added product ${product.name} into mock database`,
						)

						return yield* Effect.succeed(true)
					}),
				),
			},
			deleteProductById: {
				resolver: RequestResolver.fromEffect<
					never,
					ProductManager.DeleteProductById[`Request`]
				>(
					Effect.fn(function* (request) {
						const isAnError =
							withErrors && (yield* Random.nextRange(0, 1)) < 0.5

						if (isAnError) {
							yield* Effect.logInfo(
								`Triggered fake error on mock DeleteProductId`,
							)
							return yield* Effect.succeed(false)
						}
						yield* Effect.sleep(`200 millis`)

						yield* Ref.update(ref, dbValues => ({
							...dbValues,
							map: HashMap.remove(dbValues.map, request.id),
						}))

						return yield* Effect.succeed(true)
					}),
				),
			},
			getSortedProducts: Effect.gen(function* () {
				const isAnError = withErrors && (yield* Random.nextRange(0, 1)) < 0.5

				if (isAnError) {
					yield* Effect.logInfo(
						`Triggered fake error on mock GetSortedProducts`,
					)
					return yield* Effect.fail(undefined)
				}

				const map = yield* Ref.get(ref).pipe(Effect.map(({ map }) => map))

				const products: GetSortedProductsDTO = map.pipe(HashMap.toValues)

				return Arr.sort(products, ord)
			}),
		}
	}),
)
