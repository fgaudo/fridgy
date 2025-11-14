import { registerPlugin } from '@capacitor/core'
import * as Effect from 'effect/Effect'

import * as H from '@/core/helper.ts'

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

export class Db extends Effect.Service<Db>()(`data/capacitor/Db`, {
	sync: () => {
		const db = registerPlugin<FridgySqlitePlugin>(`FridgySqlitePlugin`)

		return {
			addProduct: Effect.fn(function* (...p: Parameters<typeof db.addProduct>) {
				return yield* H.tryPromise(() => db.addProduct(...p))
			}),
			deleteProductsByIds: Effect.fn(function* (
				...p: Parameters<typeof db.deleteProductsByIds>
			) {
				return yield* H.tryPromise(() => db.deleteProductsByIds(...p))
			}),
			getAllProductsWithTotal: H.tryPromise(() => db.getAllProductsWithTotal()),
		}
	},
}) {}
