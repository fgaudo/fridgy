import { registerPlugin } from '@capacitor/core'
import * as Arr from 'effect/Array'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

interface _SqliteCapacitorPlugin {
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

class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

class InvalidDataReceived extends Data.TaggedError(`InvalidDataReceived`) {}

export class SqliteCapacitorPlugin extends Effect.Service<SqliteCapacitorPlugin>()(
	`shared/capacitor/sqlite-capacitor-plugin`,
	{
		sync: () => {
			const db = registerPlugin<_SqliteCapacitorPlugin>(`FridgySqlitePlugin`)

			return {
				addProduct: Effect.fn(function* (p: {
					name: string
					creationDate: number
					maybeExpirationDate: Option.Option<number>
				}) {
					return yield* H.tryPromise(() =>
						db.addProduct({
							product: {
								name: p.name,
								creationDate: p.creationDate,
								expirationDate: Option.match(p.maybeExpirationDate, {
									onNone: () => undefined,
									onSome: num => num,
								}),
							},
						}),
					)
				}),

				deleteProductsByIds: Effect.fn(function* (ids: number[]) {
					return yield* H.tryPromise(() => db.deleteProductsByIds({ ids }))
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

					const entries = Arr.map(
						decodeResult.right.products,
						product =>
							({
								maybeId: Option.fromNullable(product.id),
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
							}) as const,
					)

					return entries
				}),
			}
		},
	},
) {}
