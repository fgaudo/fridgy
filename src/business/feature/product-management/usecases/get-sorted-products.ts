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

import * as Product from '../domain/entities/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'

/////
/////

export const DTO = Schema.Option(
	Schema.NonEmptyArray(
		Schema.Union(
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
					maybeExpiration: Schema.Option(
						Schema.Union(
							Schema.TaggedStruct('Stale', {
								date: Integer.Schema,
							}),
							Schema.TaggedStruct('Fresh', {
								freshness: UnitInterval.Schema,
								timeLeft: Integer.Schema,
								date: Integer.Schema,
							}),
						),
					),
				}),
			),
		),
	),
)

export type DTO = Schema.Schema.Type<typeof DTO>

/////
/////

export type Message = Data.TaggedEnum<{
	Succeeded: {
		result: DTO
	}
	Failed: object
}>

export const Message = Data.taggedEnum<Message>()

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
				run: Effect.gen(function* (): Effect.fn.Return<Message> {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const maybeProducts = yield* Effect.option(getSortedProducts)

					if (Option.isNone(maybeProducts)) {
						yield* Effect.logError(`Could not receive items.`)

						return Message.Failed()
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

									return {
										id: Symbol(),
										isCorrupt: true,
										maybeName,
									} as const
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

									return {
										id: maybeId.value,
										maybeName,
										isCorrupt: false,
										isValid: false,
									} as const
								}

								const product = maybeProduct.value

								if (!Product.hasExpirationDate(product)) {
									return {
										isCorrupt: false,
										isValid: true,
										id: maybeId.value,
										name: product.name,
										expirationDate: 'none',
									} as const
								}

								const currentDate = Integer.unsafeFromNumber(
									yield* Clock.currentTimeMillis,
								)

								if (Product.isStale(product, currentDate)) {
									return {
										isCorrupt: false,
										isValid: true,
										isStale: true,
										id: maybeId.value,
										name: product.name,
										expirationDate: product.maybeExpirationDate.value,
									} as const
								}

								return {
									isCorrupt: false,
									isValid: true,
									isStale: false,
									id: maybeId.value,
									name: product.name,
									expirationDate: product.maybeExpirationDate.value,
									timeLeft: Product.timeLeft(product, currentDate),
									freshness: Product.computeFreshness(product, currentDate),
								} as const
							}),
						),
						Effect.all,
					)

					return Message.Succeeded({
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
