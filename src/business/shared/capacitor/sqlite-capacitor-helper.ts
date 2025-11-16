import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'

import {
	GetAllProductsWithTotalDTO,
	SqliteCapacitorPlugin,
} from './sqlite-capacitor-plugin.ts'

class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

class InvalidDataReceived extends Data.TaggedError(`InvalidDataReceived`) {}

export class SqliteCapacitorHelper extends Effect.Service<SqliteCapacitorHelper>()(
	`shared/capacitor/sqlite-capacitor-helper`,
	{
		effect: Effect.gen(function* () {
			const db = yield* SqliteCapacitorPlugin

			return {
				addProduct: (p: {
					name: string
					creationDate: number
					maybeExpirationDate: Option.Option<number>
				}) =>
					H.tryPromise(() =>
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
					),

				deleteProductsByIds: (ids: number[]) =>
					H.tryPromise(() => db.deleteProductsByIds({ ids })),

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

					return decodeResult.right.products
				}),
			}
		}),
		dependencies: [SqliteCapacitorPlugin.Default],
	},
) {}
