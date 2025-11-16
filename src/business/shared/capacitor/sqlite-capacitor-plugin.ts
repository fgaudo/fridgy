import { registerPlugin } from '@capacitor/core'
import * as Effect from 'effect/Effect'
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

export const GetAllProductsWithTotalDTO = Schema.Struct({
	total: Schema.Number,
	products: Schema.Array(
		Schema.Struct({
			maybeId: Schema.OptionFromUndefinedOr(Schema.Int).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
			maybeName: Schema.OptionFromUndefinedOr(
				NonEmptyTrimmedString.Schema,
			).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
			maybeExpirationDate: Schema.OptionFromUndefinedOr(
				Integer.Schema,
			).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
			maybeCreationDate: Schema.OptionFromUndefinedOr(
				Integer.Schema,
			).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
		}).annotations({
			decodingFallback: H.fallback({
				maybeId: Option.none(),
				maybeName: Option.none(),
				maybeExpirationDate: Option.none(),
				maybeCreationDate: Option.none(),
			}),
		}),
	),
})

export class SqliteCapacitorPlugin extends Effect.Service<SqliteCapacitorPlugin>()(
	`shared/capacitor/sqlite-capacitor-plugin`,
	{
		sync: () => {
			const plugin =
				registerPlugin<_SqliteCapacitorPlugin>(`FridgySqlitePlugin`)

			return {
				addProduct: (...p: Parameters<_SqliteCapacitorPlugin[`addProduct`]>) =>
					H.tryPromise(() => plugin.addProduct(...p)),

				deleteProductsByIds: (
					...p: Parameters<_SqliteCapacitorPlugin[`deleteProductsByIds`]>
				) => H.tryPromise(() => plugin.deleteProductsByIds(...p)),

				getAllProductsWithTotal: H.tryPromise(() =>
					plugin.getAllProductsWithTotal(),
				),
			}
		},
	},
) {}
