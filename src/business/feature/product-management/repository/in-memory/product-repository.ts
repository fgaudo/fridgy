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

import * as ProductRepository from '../product-repository.ts'

const ord = Order.make(
	Order.combineAll([
		pipe(
			Order.number,
			Order.reverse,
			Option.getOrder,
			Order.reverse,
			Order.mapInput(
				(product: Option.Option.Value<ProductRepository.GetProducts>[0]) =>
					product.maybeExpirationDate,
			),
		),
		pipe(
			Order.string,
			Option.getOrder,
			Order.mapInput(
				(product: Option.Option.Value<ProductRepository.GetProducts>[0]) =>
					product.maybeName,
			),
		),
	]),
)

export const layer = ({ withErrors }: { withErrors: boolean }) =>
	Layer.effect(
		ProductRepository.ProductRepository,
		Effect.gen(function* () {
			const ref = yield* Ref.make({
				index: 0,
				map: HashMap.empty<
					string,
					Option.Option.Value<ProductRepository.GetProducts>[0]
				>(),
			})

			return {
				getProducts: Effect.gen(function* () {
					const isAnError = withErrors && (yield* Random.nextRange(0, 1)) < 0.5

					if (isAnError) {
						yield* Effect.logDebug(
							'Triggered fake error on in-memory GetSortedProducts',
						)
						return yield* Effect.fail(undefined)
					}

					const map = yield* Ref.get(ref).pipe(Effect.map(({ map }) => map))

					const products = map.pipe(HashMap.toValues)

					yield* Effect.sleep(300)

					return Arr.isNonEmptyReadonlyArray(products)
						? Option.some(Arr.sort(products, ord))
						: Option.none()
				}),

				deleteProductByIdResolver: RequestResolver.fromEffect<
					never,
					ProductRepository.DeleteProductById['Request']
				>(
					Effect.fn(function* (request) {
						const isAnError =
							withErrors && (yield* Random.nextRange(0, 1)) < 0.5

						if (isAnError) {
							yield* Effect.logDebug(
								'Triggered fake error on in-memory DeleteProductId',
							)
							return yield* Effect.succeed(undefined)
						}
						yield* Effect.sleep('200 millis')

						yield* Ref.update(ref, dbValues => ({
							...dbValues,
							map: HashMap.remove(dbValues.map, request.id),
						}))

						yield* Effect.sleep('500 millis')

						return yield* Effect.succeed(undefined)
					}),
				),

				addProductResolver: RequestResolver.fromEffect<
					never,
					ProductRepository.AddProduct['Request']
				>(
					Effect.fn(function* (product) {
						const isAnError =
							withErrors && (yield* Random.nextRange(0, 1)) < 0.5

						if (isAnError) {
							yield* Effect.logDebug(
								'Triggered fake error on in-memory AddProduct',
							)
							return yield* Effect.fail(undefined)
						}

						yield* Effect.logDebug(
							'Attempting to add product into in-memory database...',
						)

						const { index } = yield* Ref.updateAndGet(ref, dbValues => {
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

						yield* Effect.logDebug(
							`Added product ${product.name} into in-memory database`,
						)

						return index.toString(10)
					}),
				),
			}
		}),
	)
