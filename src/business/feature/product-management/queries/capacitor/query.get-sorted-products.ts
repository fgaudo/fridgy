import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

import * as GetSortedProducts from '../get-sorted-products'
import * as Db from './db'

export const Backend = Schema.Struct({
	total: Schema.Number,
	products: Schema.Array(
		Schema.Struct({
			id: Schema.UndefinedOr(Schema.Int).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			name: Schema.UndefinedOr(Schema.String).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			expirationDate: Schema.UndefinedOr(Schema.JsonNumber).annotations({
				decodingFallback: H.fallback(undefined),
			}),
			creationDate: Schema.UndefinedOr(Schema.JsonNumber).annotations({
				decodingFallback: H.fallback(undefined),
			}),
		}).annotations({
			decodingFallback: H.fallback({
				id: undefined,
				name: undefined,
				expirationDate: undefined,
				creationDate: undefined,
			}),
		}),
	),
})

class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

class InvalidDataReceived extends Data.TaggedError(`InvalidDataReceived`) {}

export const query = Layer.effect(
	GetSortedProducts.GetSortedProducts,
	Effect.gen(function* () {
		const { getAllProductsWithTotal } = yield* Db.Db
		return {
			run: Effect.gen(function* () {
				const result = yield* Effect.either(getAllProductsWithTotal)

				if (Either.isLeft(result)) {
					yield* Effect.logError(result.left)
					return yield* new FetchingFailed()
				}

				const decodeResult = yield* pipe(
					Schema.decodeUnknown(Backend)(result.right),
					Effect.either,
				)

				if (Either.isLeft(decodeResult)) {
					return yield* new InvalidDataReceived()
				}

				const entries = yield* pipe(
					decodeResult.right.products,
					Arr.map(
						Effect.fn(function* (product) {
							return {
								maybeId: yield* Option.match(Option.fromNullable(product.id), {
									onNone: () => Effect.succeed(Option.none<string>()),
									onSome: id =>
										Effect.option(Effect.try(() => JSON.stringify(id))),
								}),

								maybeName: pipe(
									Option.fromNullable(product.name),
									Option.flatMap(NonEmptyTrimmedString.fromString),
								),

								maybeExpirationDate: pipe(
									Option.fromNullable(product.expirationDate),
									Option.flatMap(Integer.fromNumber),
								),

								maybeCreationDate: pipe(
									Option.fromNullable(product.creationDate),
									Option.flatMap(Integer.fromNumber),
								),
							} as const
						}),
					),
					Effect.all,
				)

				return entries
			}),
		}
	}),
)
