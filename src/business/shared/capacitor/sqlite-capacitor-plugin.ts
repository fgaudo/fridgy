import { registerPlugin } from '@capacitor/core'
import * as Effect from 'effect/Effect'
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

export class SqliteCapacitorPlugin extends Effect.Service<SqliteCapacitorPlugin>()(
	`shared/capacitor/sqlite-capacitor-plugin`,
	{
		sync: () => registerPlugin<_SqliteCapacitorPlugin>(`FridgySqlitePlugin`),
	},
) {}
