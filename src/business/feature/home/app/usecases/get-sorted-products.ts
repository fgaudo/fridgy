import * as Array from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

import * as GetSortedProductsQuery from '@/shared/app/queries/get-sorted-products.ts'
import * as Product from '@/shared/domain/product.ts'

export const GetSortedProductsDTO = Schema.Array(
	Schema.Union(
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
			maybeExpirationDate: Schema.Option(Integer.Schema),
			maybeCreationDate: Schema.Option(Integer.Schema),
			isValid: Schema.Literal(false),
		}),
		Schema.Struct({
			isCorrupt: Schema.Literal(false),
			id: Schema.String,
			name: NonEmptyTrimmedString.Schema,
			maybeExpirationDate: Schema.Option(Integer.Schema),
			creationDate: Integer.Schema,
			isValid: Schema.Literal(true),
		}),
		Schema.Struct({
			isCorrupt: Schema.Literal(true),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		}),
	),
)

export type GetSortedProductsDTO = Schema.Schema.Type<
	typeof GetSortedProductsDTO
>

export type Message = Data.TaggedEnum<{
	FetchListSucceeded: {
		result: GetSortedProductsDTO
	}
	FetchListFailed: object
}>

export const Message = Data.taggedEnum<Message>()

export class GetSortedProducts extends Effect.Service<GetSortedProducts>()(
	`home/usecases/GetSortedProducts`,
	{
		accessors: true,
		effect: Effect.gen(function* () {
			const { run: query } = yield* GetSortedProductsQuery.GetSortedProducts

			return {
				run: Effect.gen(function* () {
					yield* Effect.log(`Requested to fetch the list of products`)

					yield* Effect.log(`Attempting to fetch the list of products...`)

					const errorOrData = yield* pipe(query, Effect.either)
					if (
						Either.isLeft(errorOrData) &&
						errorOrData.left._tag === `FetchingFailed`
					) {
						yield* Effect.logError(`Could not receive items.`)

						return Message.FetchListFailed()
					}

					if (Either.isLeft(errorOrData)) {
						yield* Effect.logError(`Received invalid data.`)

						return Message.FetchListFailed()
					}

					const result = errorOrData.right

					const entries = yield* pipe(
						result,
						Array.map(
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

									return yield* Product.fromStruct({
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
										maybeCreationDate,
										maybeExpirationDate,
										isCorrupt: false,
										isValid: false,
									} as const
								}

								return {
									isCorrupt: false,
									isValid: true,
									id: maybeId.value,
									name: maybeProduct.value.name,
									creationDate: maybeProduct.value.creationDate,
									maybeExpirationDate: maybeProduct.value.maybeExpirationDate,
								} as const
							}),
						),
						Effect.all,
					)

					return Message.FetchListSucceeded({ result: entries })
				}).pipe(Effect.withLogSpan(`GetSortedProducts UC`)),
			}
		}),
	},
) {}
