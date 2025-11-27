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

import * as _Product from '../domain/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'

/////
/////

type Product = Data.TaggedEnum<{
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
	Data.taggedEnum<Data.TaggedEnum.Value<Product, 'Valid'>['status']>()

export const Product = Data.taggedEnum<Product>()

export type Response = Data.TaggedEnum<{
	Succeeded: {
		maybeProducts: Option.Option<{
			total: PositiveInteger.PositiveInteger
			list: NonEmptyIterable.NonEmptyIterable<Product>
		}>
	}
	Failed: object
}>

export const Response = Data.taggedEnum<Response>()

/////
/////

export class Service extends Effect.Service<Service>()(
	`feature/product-management/usecases/get-sorted-products`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { getSortedProducts } = yield* ProductManager.Service
			const { makeProduct } = yield* _Product.Service
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
								return Product.Corrupt({
									maybeName,
								})
							}

							const maybeProduct = Option.gen(function* () {
								const { name, creationDate } = yield* Option.all({
									name: maybeName,
									creationDate: maybeCreationDate,
								})

								return yield* makeProduct({
									name,
									creationDate,
									maybeExpirationDate,
								})
							})

							if (Option.isNone(maybeProduct)) {
								yield* Effect.logWarning(`Product is invalid.`)

								return Product.Invalid({
									id: maybeId.value,
									maybeName,
								})
							}

							const product = maybeProduct.value

							if (!_Product.hasExpirationDate(product)) {
								return Product.Valid({
									id: maybeId.value,
									name: product.name,
									status: Status.Everlasting(),
								})
							}

							const currentDate = Integer.unsafeFromNumber(
								yield* Clock.currentTimeMillis,
							)

							if (_Product.isStale(product, currentDate)) {
								return Product.Valid({
									id: maybeId.value,
									name: product.name,
									status: Status.Stale({
										expirationDate: product.maybeExpirationDate.value,
									}),
								})
							}

							return Product.Valid({
								id: maybeId.value,
								name: product.name,
								status: Status.Fresh({
									expirationDate: product.maybeExpirationDate.value,
									timeLeft: _Product.timeLeft(product, currentDate),
									freshnessRatio: _Product.computeFreshness(
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
		dependencies: [_Product.Service.Default],
	},
) {}
