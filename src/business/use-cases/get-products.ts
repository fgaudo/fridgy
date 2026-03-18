import * as Arr from 'effect/Array'
import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import * as Product from '../domain/product.ts'
import * as GetProductsPort from '../ports/get-products.ts'

export type ProductDTO = Data.TaggedEnum<{
	Invalid: {
		maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
		id: Option.Option<string>
	}
	Valid: {
		id: string
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		status: Data.TaggedEnum<{
			Everlasting: object
			Stale: {
				expirationDate: Integer.Integer
			}
			Fresh: {
				freshnessRatio: UnitInterval.UnitInterval
				timeLeft: Integer.Integer
				expirationDate: Integer.Integer
			}
		}>
	}
}>

export const Status =
	Data.taggedEnum<Data.TaggedEnum.Value<ProductDTO, 'Valid'>['status']>()

export const ProductDTO = Data.taggedEnum<ProductDTO>()

export type Response = Data.TaggedEnum<{
	Succeeded: {
		maybeProducts: Option.Option<Arr.NonEmptyArray<ProductDTO>>
	}
	Failed: object
}>

export const Response = Data.taggedEnum<Response>()

export class GetProducts extends ServiceMap.Service<GetProducts>()(
	'06a610be80140f91',
	{
		make: Effect.gen(function* () {
			const { run } = yield* GetProductsPort.GetProducts

			return {
				run: Effect.gen(function* (): Effect.fn.Return<Response> {
					yield* Effect.log('Started')

					const maybeProducts = yield* Effect.option(run)

					if (Option.isNone(maybeProducts)) {
						yield* Effect.logError('Could not receive products')

						return Response.Failed()
					}

					const entries = yield* Effect.forEach(
						maybeProducts.value,
						Effect.fn(function* (productData) {
							if (Option.isNone(productData.maybeId)) {
								return ProductDTO.Invalid({
									id: productData.maybeId,
									maybeName: productData.maybeName,
								})
							}

							const maybeProduct = Product.makeProduct(productData)

							if (Option.isNone(maybeProduct)) {
								return ProductDTO.Invalid({
									id: productData.maybeId,
									maybeName: productData.maybeName,
								})
							}

							const product = maybeProduct.value

							if (!Product.isExpirable(product)) {
								return ProductDTO.Valid({
									id: productData.maybeId.value,
									name: Product.name(product),
									status: Status.Everlasting(),
								})
							}

							const currentDate = Integer.unsafeFromNumber(
								yield* Clock.currentTimeMillis,
							)

							const isFresh = Product.isFresh(currentDate)(product)

							if (isFresh._tag === 'False') {
								return ProductDTO.Valid({
									id: productData.maybeId.value,
									name: Product.name(product),
									status: Status.Stale({
										expirationDate: Product.expirationDate(product),
									}),
								})
							}

							return ProductDTO.Valid({
								id: productData.maybeId.value,
								name: Product.name(product),
								status: Status.Fresh({
									expirationDate: Product.expirationDate(product),
									timeLeft: isFresh.timeLeft,
									freshnessRatio: isFresh.freshness,
								}),
							})
						}),
					)
					return Response.Succeeded({
						maybeProducts: entries,
					})
				}).pipe(Effect.withLogSpan('GetProducts')),
			}
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
