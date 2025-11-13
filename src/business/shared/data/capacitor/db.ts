import { registerPlugin } from '@capacitor/core'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

interface FridgySqlitePlugin {
	getAllProductsWithTotal(): Promise<unknown>

	addProduct(data: {
		product: {
			name: string
			creationDate: number
			expirationDate: number | undefined
		}
	}): Promise<unknown>

	deleteProductsByIds(data: { ids: readonly number[] }): Promise<unknown>
}

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

export class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

export class InvalidDataReceived extends Data.TaggedError(
	`InvalidDataReceived`,
) {}

export class DeleteFailed extends Data.TaggedError(`DeleteFailed`) {}

export class AddProductFailed extends Data.TaggedError(`AddProductFailed`) {}

export class Db extends Effect.Service<Db>()(`data/capacitor/Db`, {
	sync: () => {
		const db = registerPlugin<FridgySqlitePlugin>(`FridgySqlitePlugin`)

		return {
			addProduct: (...p: Parameters<typeof db.addProduct>) =>
				Effect.gen(function* () {
					const result = yield* Effect.either(
						H.tryPromise(() => db.addProduct(...p)),
					)

					if (Either.isLeft(result)) {
						yield* Effect.logError(result.left)
						return yield* new AddProductFailed()
					}

					return yield* Effect.void
				}),

			deleteProductsByIds: (...p: Parameters<typeof db.deleteProductsByIds>) =>
				Effect.gen(function* () {
					const result = yield* Effect.either(
						H.tryPromise(() => db.deleteProductsByIds(...p)),
					)

					if (Either.isLeft(result)) {
						yield* Effect.logError(result.left)
						return yield* new DeleteFailed()
					}

					return yield* Effect.void
				}),
			getAllProductsWithTotal: Effect.gen(function* () {
				const result = yield* Effect.either(
					H.tryPromise(() => db.getAllProductsWithTotal()),
				)

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
	},
}) {}
