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
			isCorrupt: Schema.Literal(false),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
			id: Schema.String,
			isValid: Schema.Literal(false),
		}),
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			name: NonEmptyTrimmedString.Schema,
			isValid: Schema.Literal(true),
			maybeExpirationDate: Schema.Option(Integer.Schema),
			creationDate: Integer.Schema,
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
	FetchListSucceeded: {
		result: DTO
	}
	FetchListFailed: object
}>

export const Message = Data.taggedEnum<Message>()

/////
/////

export class GetSortedProducts extends Effect.Service<GetSortedProducts>()(
	`feature/product-management/usecases/get-sorted-products`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { getSortedProducts } = yield* ProductManager.ProductManager
			const { makeProduct } = yield* Product.ProductService
			return {
				run: Effect.gen(function* () {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const errorOrData = yield* pipe(getSortedProducts, Effect.either)

					if (Either.isLeft(errorOrData)) {
						yield* Effect.logError(`Could not receive items.`)

						return Message.FetchListFailed()
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

								return {
									isCorrupt: false,
									isValid: true,
									id: maybeId.value,
									name: maybeProduct.value.name,
									maybeExpirationDate: maybeProduct.value.maybeExpirationDate,
									creationDate: maybeProduct.value.creationDate,
								} as const
							}),
						),
						Effect.all,
					)

					return Message.FetchListSucceeded({ result: entries })
				}).pipe(Effect.withLogSpan(`GetSortedProducts UC`)),
			}
		}),
		dependencies: [Product.ProductService.Default],
	},
) {}
