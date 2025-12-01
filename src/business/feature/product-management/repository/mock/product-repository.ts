import * as Arr from 'effect/Array'
import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'
import * as Random from 'effect/Random'
import * as Ref from 'effect/Ref'
import * as RequestResolver from 'effect/RequestResolver'

import * as ProductRepository from '../product-repository.ts'

const ord = Order.make(
	Order.combineAll([
		pipe(
			Order.number,
			Order.reverse,
			Option.getOrder,
			Order.reverse,
			Order.mapInput(
				(product: ProductRepository.GetProducts[0]) =>
					product.maybeExpirationDate,
			),
		),
		pipe(
			Order.string,
			Option.getOrder,
			Order.mapInput(
				(product: ProductRepository.GetProducts[0]) => product.maybeName,
			),
		),
	]),
)

export class Config extends Context.Tag(
	`feature/product-management/repository/mock/config`,
)<Config, { withErrors: boolean }>() {}

export const layerWithoutDependencies = Layer.effect(
	ProductRepository.ProductRepository,
	Effect.gen(function* () {
		const { withErrors } = yield* Config

		const ref = yield* Ref.make({
			index: 0,
			map: HashMap.empty<string, ProductRepository.GetProducts[0]>(),
		})

		return {
			getProducts: Effect.gen(function* () {
				const isAnError = withErrors && (yield* Random.nextRange(0, 1)) < 0.5

				if (isAnError) {
					yield* Effect.logInfo(
						`Triggered fake error on mock GetSortedProducts`,
					)
					return yield* Effect.fail(undefined)
				}

				const map = yield* Ref.get(ref).pipe(Effect.map(({ map }) => map))

				const products: ProductRepository.GetProducts = map.pipe(
					HashMap.toValues,
				)

				yield* Effect.sleep(300)
				return Arr.sort(products, ord)
			}),
			deleteProductByIdResolver: RequestResolver.fromEffect<
				never,
				ProductRepository.DeleteProductById[`Request`]
			>(
				Effect.fn(function* (request) {
					const isAnError = withErrors && (yield* Random.nextRange(0, 1)) < 0.5

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

					yield* Effect.sleep('500 millis')

					return yield* Effect.succeed(true)
				}),
			),

			addProductResolver: RequestResolver.fromEffect<
				never,
				ProductRepository.AddProduct[`Request`]
			>(
				Effect.fn(function* (product) {
					const isAnError = withErrors && (yield* Random.nextRange(0, 1)) < 0.5

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
									maybeName: Option.some(product.name),
									maybeExpirationDate: product.maybeExpirationDate,
									maybeCreationDate: Option.some(product.creationDate),
									maybeId: Option.some(indexString),
								}),
							),
						}
					})
					yield* Effect.sleep('500 millis')

					yield* Effect.log(`Added product ${product.name} into mock database`)

					return yield* Effect.succeed(true)
				}),
			),
		}
	}),
)
