import * as Arr from 'effect/Array'
import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as NonEmptyIterable from 'effect/NonEmptyIterable'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'
import * as PositiveInteger from '@/core/integer/positive.ts'
import * as NonEmptyIterableHelper from '@/core/non-empty-iterable.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import * as Product from '../domain/product.ts'
import * as ProductRepository from '../repository/product-repository.ts'

/////
/////

type ProductDTO = Data.TaggedEnum<{
	Corrupt: {
		maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
	}
	Invalid: {
		maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
		id: string
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
		maybeProducts: Option.Option<{
			total: PositiveInteger.PositiveInteger
			list: NonEmptyIterable.NonEmptyIterable<ProductDTO>
		}>
	}
	Failed: object
}>

export const Response = Data.taggedEnum<Response>()

/////
/////

export class GetProducts extends Effect.Service<GetProducts>()(
	`feature/product-management/usecase/get-products`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { getProducts: getSortedProducts } =
				yield* ProductRepository.ProductRepository
			const ProductService = yield* Product.ProductService
			return {
				run: Effect.gen(function* (): Effect.fn.Return<Response> {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const maybeProducts = yield* Effect.option(getSortedProducts)

					if (Option.isNone(maybeProducts)) {
						yield* Effect.logError(`Could not receive items.`)

						return Response.Failed()
					}

					const result = maybeProducts.value

					const entries = yield* Effect.forEach(
						result,
						Effect.fn(function* ({
							maybeId,
							maybeName,
							maybeCreationDate,
							maybeExpirationDate,
						}) {
							if (Option.isNone(maybeId)) {
								yield* Effect.logWarning(`CORRUPTION - Product has no id.`)
								return ProductDTO.Corrupt({
									maybeName,
								})
							}

							const maybeProduct = Option.gen(function* () {
								const { name, creationDate } = yield* Option.all({
									name: maybeName,
									creationDate: maybeCreationDate,
								})

								return yield* ProductService.makeProduct({
									name,
									creationDate,
									maybeExpirationDate,
								})
							})

							if (Option.isNone(maybeProduct)) {
								yield* Effect.logWarning(`Product is invalid.`)

								return ProductDTO.Invalid({
									id: maybeId.value,
									maybeName,
								})
							}

							const product = maybeProduct.value

							if (!ProductService.hasExpirationDate(product)) {
								return ProductDTO.Valid({
									id: maybeId.value,
									name: product.name,
									status: Status.Everlasting(),
								})
							}

							const currentDate = Integer.unsafeFromNumber(
								yield* Clock.currentTimeMillis,
							)

							if (ProductService.isStale(product, currentDate)) {
								return ProductDTO.Valid({
									id: maybeId.value,
									name: product.name,
									status: Status.Stale({
										expirationDate: product.maybeExpirationDate.value,
									}),
								})
							}

							return ProductDTO.Valid({
								id: maybeId.value,
								name: product.name,
								status: Status.Fresh({
									expirationDate: product.maybeExpirationDate.value,
									timeLeft: ProductService.timeLeft(product, currentDate),
									freshnessRatio: ProductService.computeFreshness(
										product,
										currentDate,
									),
								}),
							})
						}),
					)

					return Response.Succeeded({
						maybeProducts: pipe(
							NonEmptyIterableHelper.fromIterable(entries),
							Option.map(iterable => ({
								total: PositiveInteger.unsafeFromNumber(Arr.length(entries)),
								list: iterable,
							})),
						),
					})
				}).pipe(Effect.withLogSpan(`GetSortedProducts UC`)),
			}
		}),
		dependencies: [Product.ProductService.Default],
	},
) {}
