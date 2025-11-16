import { registerPlugin } from '@capacitor/core'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Schema from 'effect/Schema'

import * as H from '@/core/helper.ts'

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
			maybeName: Schema.OptionFromUndefinedOr(Schema.String).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
			maybeExpirationDate: Schema.OptionFromUndefinedOr(
				Schema.JsonNumber,
			).annotations({
				decodingFallback: H.fallback(Option.none()),
			}),
			maybeCreationDate: Schema.OptionFromUndefinedOr(
				Schema.JsonNumber,
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
		sync: () => registerPlugin<_SqliteCapacitorPlugin>(`FridgySqlitePlugin`),
	},
) {}
