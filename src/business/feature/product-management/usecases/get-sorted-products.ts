import * as Arr from 'effect/Array'
import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

import * as Product from '../domain/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'

/////
/////

class Succeeded extends Schema.TaggedClass<Succeeded>()('Succeeded', {
	result: Schema.Option(
		Schema.NonEmptyArray(
			Schema.Union(
				Schema.TaggedStruct('Corrupt', {
					maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
				}),
				Schema.TaggedStruct('Invalid', {
					maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
					id: Schema.String,
				}),
				Schema.TaggedStruct('Valid', {
					id: Schema.String,
					name: NonEmptyTrimmedString.Schema,
					status: Schema.Union(
						Schema.TaggedStruct('Everlasting', {}),
						Schema.TaggedStruct('Stale', {
							expirationDate: Integer.Schema,
						}),
						Schema.TaggedStruct('Fresh', {
							freshnessRatio: UnitInterval.Schema,
							timeLeft: Integer.Schema,
							expirationDate: Integer.Schema,
						}),
					),
				}),
			),
		),
	),
}) {
	static readonly ProductDTO =
		Data.taggedEnum<Option.Option.Value<Succeeded['result']>[0]>()

	static readonly StatusDTO =
		Data.taggedEnum<
			Data.TaggedEnum.Value<
				Option.Option.Value<Succeeded['result']>[0],
				'Valid'
			>['status']
		>()
}

class Failed extends Schema.TaggedClass<Failed>()('Failed', {}) {}

export type Response = Failed | Succeeded

export const Response = {
	Succeeded,
	Failed,
}

/////
/////

export class Service extends Effect.Service<Service>()(
	`feature/product-management/usecases/get-sorted-products`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { getSortedProducts } = yield* ProductManager.Service
			const { makeProduct } = yield* Product.Service
			return {
				run: Effect.gen(function* (): Effect.fn.Return<Response> {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const maybeProducts = yield* Effect.option(getSortedProducts)

					if (Option.isNone(maybeProducts)) {
						yield* Effect.logError(`Could not receive items.`)

						return new Failed()
					}

					const result = maybeProducts.value

					const entries = yield* pipe(
						result,
						Arr.map(
							Effect.fn(function* ({
								maybeId,
								maybeName,
								maybeCreationDate,
								maybeExpirationDate,
							}) {
								if (Option.isNone(maybeId)) {
									yield* Effect.logWarning(`CORRUPTION - Product has no id.`)

									return Succeeded.ProductDTO.Corrupt({
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

									return Succeeded.ProductDTO.Invalid({
										id: maybeId.value,
										maybeName,
									})
								}

								const product = maybeProduct.value

								if (!Product.hasExpirationDate(product)) {
									return Succeeded.ProductDTO.Valid({
										id: maybeId.value,
										name: product.name,
										status: Succeeded.StatusDTO.Everlasting(),
									})
								}

								const currentDate = Integer.unsafeFromNumber(
									yield* Clock.currentTimeMillis,
								)

								if (Product.isStale(product, currentDate)) {
									return Succeeded.ProductDTO.Valid({
										id: maybeId.value,
										name: product.name,
										status: Succeeded.StatusDTO.Stale({
											expirationDate: product.maybeExpirationDate.value,
										}),
									})
								}

								return Succeeded.ProductDTO.Valid({
									id: maybeId.value,
									name: product.name,
									status: Succeeded.StatusDTO.Fresh({
										expirationDate: product.maybeExpirationDate.value,
										timeLeft: Product.timeLeft(product, currentDate),
										freshnessRatio: Product.computeFreshness(
											product,
											currentDate,
										),
									}),
								})
							}),
						),
						Effect.all,
					)

					return new Succeeded({
						result: Arr.isNonEmptyArray(entries)
							? Option.some(entries)
							: Option.none(),
					})
				}).pipe(Effect.withLogSpan(`GetSortedProducts UC`)),
			}
		}),
		dependencies: [Product.Service.Default],
	},
) {}
