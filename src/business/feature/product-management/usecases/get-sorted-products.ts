import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

import * as Product from '../domain/entities/product.ts'
import * as ProductManager from '../interfaces/product-manager.ts'

/////
/////

export const DTO = Schema.Array(
	Schema.Union(
		Schema.Struct({
			id: Schema.String,
			isCorrupt: Schema.Literal(false),
			isValid: Schema.Literal(false),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		}),
		Schema.Struct({
			creationDate: Integer.Schema,
			id: Schema.String,
			isCorrupt: Schema.Literal(false),
			isValid: Schema.Literal(true),
			maybeExpirationDate: Schema.Option(Integer.Schema),
			name: NonEmptyTrimmedString.Schema,
		}),
		Schema.Struct({
			isCorrupt: Schema.Literal(true),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		}),
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
		dependencies: [Product.Service.Default],
		effect: Effect.gen(function* () {
			const { getSortedProducts } = yield* ProductManager.Service
			const { makeProduct } = yield* Product.Service
			return {
				run: Effect.gen(function* () {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const errorOrData = yield* pipe(getSortedProducts, Effect.either)

					if (Either.isLeft(errorOrData)) {
						yield* Effect.logError(`Could not receive items.`)

						return Message.Failed()
					}

					const result = errorOrData.right

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
										creationDate: maybeCreationDate,
										name: maybeName,
									})

									return yield* makeProduct({
										creationDate,
										maybeExpirationDate,
										name,
									})
								})

								if (Option.isNone(maybeProduct)) {
									yield* Effect.logWarning(`Product is invalid.`)

									return {
										id: maybeId.value,
										isCorrupt: false,
										isValid: false,
										maybeName,
									} as const
								}

								return {
									creationDate: maybeProduct.value.creationDate,
									id: maybeId.value,
									isCorrupt: false,
									isValid: true,
									maybeExpirationDate: maybeProduct.value.maybeExpirationDate,
									name: maybeProduct.value.name,
								} as const
							}),
						),
						Effect.all,
					)

					return Message.Succeeded({ result: entries })
				}).pipe(Effect.withLogSpan(`GetSortedProducts UC`)),
			}
		}),
	},
) {}
