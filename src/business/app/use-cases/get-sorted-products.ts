import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as Integer from '../../../core/integer'
import * as NonEmptyTrimmedString from '../../../core/non-empty-trimmed-string'
import * as Product from '../../domain/product'
import { GetSortedProducts as GetSortedProductsOperation } from '../operations'

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

export class GetSortedProducts extends Effect.Service<GetSortedProducts>()(
	`app/useCases/GetSortedProducts`,
	{
		effect: Effect.gen(function* () {
			const getSortedProducts = yield* GetSortedProductsOperation.Tag

			return Effect.gen(function* () {
				yield* Effect.log(`Requested to fetch the list of products`)

				yield* Effect.log(`Attempting to fetch the list of products...`)

				const errorOrData = yield* pipe(getSortedProducts, Effect.either)
				if (
					Either.isLeft(errorOrData) &&
					errorOrData.left._tag === `FetchingFailed`
				) {
					yield* Effect.logError(`Could not receive items.`)

					return yield* Effect.fail(undefined)
				}

				if (Either.isLeft(errorOrData)) {
					yield* Effect.logError(`Received invalid data.`)

					return yield* Effect.fail(undefined)
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

				return entries satisfies GetSortedProductsDTO
			}).pipe(Effect.withLogSpan(`GetSortedProducts UC`))
		}),
	},
) {}
