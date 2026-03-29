import * as Arr from 'effect/Array'
import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import * as Product from '@/business/domain/product.ts'
import * as GetProductsPort from '@/business/ports/get-products.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NormalizedString from '@/core/normalized-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

export type ProductDTO = Data.TaggedEnum<{
	Invalid: {
		maybeName: Option.Option<string>
		maybeId: Option.Option<string>
	}
	Valid: {
		id: string
		name: string
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
			const getProducts = yield* GetProductsPort.GetProducts

			// @effect-diagnostics-next-line returnEffectInGen:off
			return Effect.gen(function* (): Effect.fn.Return<Response> {
				yield* Effect.log('Started')

				const maybeProducts = yield* Effect.option(getProducts)

				if (Option.isNone(maybeProducts)) {
					yield* Effect.logError('Could not receive products')

					return Response.Failed()
				}

				const entries = yield* Effect.forEach(
					maybeProducts.value,
					Effect.fn(function* (productData) {
						if (Option.isNone(productData.maybeId)) {
							return ProductDTO.Invalid({
								maybeId: productData.maybeId,
								maybeName: Option.map(productData.maybeName, string =>
									NormalizedString.makeNormalized(string).pipe(
										Option.getOrElse(() => '[Invalid name]'),
									),
								),
							})
						}

						const maybeProduct = Product.makeProduct(productData)

						if (Option.isNone(maybeProduct)) {
							return ProductDTO.Invalid({
								maybeId: productData.maybeId,
								maybeName: Option.map(productData.maybeName, string =>
									NormalizedString.makeNormalized(string).pipe(
										Option.getOrElse(() => '[Invalid name]'),
									),
								),
							})
						}

						const product = maybeProduct.value

						const maybeExpiration = Product.maybeExpiration(product)
						if (Option.isNone(maybeExpiration)) {
							return ProductDTO.Valid({
								id: productData.maybeId.value,
								name: Product.name(product),
								status: Status.Everlasting(),
							})
						}

						const currentDate = Integer.unsafeFromNumber(
							yield* Clock.currentTimeMillis,
						)

						const status = Product.expirationStatus(currentDate)(
							maybeExpiration.value,
						)

						if (status.hasExpired) {
							return ProductDTO.Valid({
								id: productData.maybeId.value,
								name: Product.name(product),
								status: Status.Stale({
									expirationDate: Product.expirationDate(maybeExpiration.value),
								}),
							})
						}

						return ProductDTO.Valid({
							id: productData.maybeId.value,
							name: Product.name(product),
							status: Status.Fresh({
								expirationDate: Product.expirationDate(maybeExpiration.value),
								timeLeft: status.timeLeft,
								freshnessRatio: status.freshness,
							}),
						})
					}),
				)
				return Response.Succeeded({
					maybeProducts: Arr.isArrayNonEmpty(entries)
						? Option.some(entries)
						: Option.none(),
				})
			}).pipe(Effect.withLogSpan('GetProducts'))
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
