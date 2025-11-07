import { registerPlugin } from '@capacitor/core'
import * as Effect from 'effect/Effect'

import * as H from '../../../core/helper'

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

export class DbPlugin extends Effect.Service<DbPlugin>()(`DbPlugin`, {
	sync: () => {
		const db = registerPlugin<FridgySqlitePlugin>(`FridgySqlitePlugin`)

		return {
			addProduct: (...p: Parameters<typeof db.addProduct>) =>
				H.tryPromise(() => db.addProduct(...p)),

			deleteProductsByIds: (...p: Parameters<typeof db.deleteProductsByIds>) =>
				H.tryPromise(() => db.deleteProductsByIds(...p)),

			getAllProductsWithTotal: H.tryPromise(() => db.getAllProductsWithTotal()),
		}
	},
}) {}
