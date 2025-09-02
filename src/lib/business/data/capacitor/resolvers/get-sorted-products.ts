import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '$lib/core/helper.ts'
import * as Integer from '$lib/core/integer/index.ts'
import { withLayerLogging } from '$lib/core/logging.ts'
import * as NonEmptyTrimmedString from '$lib/core/non-empty-trimmed-string.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

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

export const query = Layer.effect(
	GetSortedProducts.Tag,
	Effect.gen(function* () {
		const { getAllProductsWithTotal } = yield* DbPlugin
		return Effect.gen(function* () {
			const result = yield* pipe(getAllProductsWithTotal, Effect.either)

			if (Either.isLeft(result)) {
				yield* Effect.logError(result.left)
				return yield* new GetSortedProducts.FetchingFailed()
			}

			const decodeResult = yield* pipe(
				Schema.decodeUnknown(Backend)(result.right),
				Effect.either,
			)

			if (Either.isLeft(decodeResult)) {
				return yield* new GetSortedProducts.InvalidDataReceived()
			}

			const entries = yield* Effect.all(
				decodeResult.right.products.map(product =>
					Effect.gen(function* () {
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
			)

			return entries
		}).pipe(withLayerLogging(`I`))
	}),
)
