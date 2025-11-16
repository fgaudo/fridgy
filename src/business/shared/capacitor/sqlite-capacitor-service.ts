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

import {
	GetAllProductsWithTotalDTO,
	SqliteCapacitorPlugin,
} from './sqlite-capacitor-plugin.ts'

class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

class InvalidDataReceived extends Data.TaggedError(`InvalidDataReceived`) {}

export class SqliteCapacitorService extends Effect.Service<SqliteCapacitorService>()(
	`shared/capacitor/sqlite-capacitor-service`,
	{
		effect: Effect.gen(function* () {
			const db = yield* SqliteCapacitorPlugin

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
						Schema.decodeUnknown(GetAllProductsWithTotalDTO)(result.right),
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
		}),
		dependencies: [SqliteCapacitorPlugin.Default],
	},
) {}
