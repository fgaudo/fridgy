import { registerPlugin } from '@capacitor/core'

import { Eff, H } from '$lib/core/imports.ts'

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

export class DbPlugin extends Eff.Service<DbPlugin>()(`DbPlugin`, {
	sync: () => {
		const db = registerPlugin<FridgySqlitePlugin>(`FridgySqlitePlugin`)

		return {
			addProduct: (...p: Parameters<typeof db.addProduct>) =>
				H.tryPromise(() => db.addProduct(...p)),

			deleteProductsByIds: (...p: Parameters<typeof db.deleteProductsByIds>) =>
				H.tryPromise(() => db.deleteProductsByIds(...p)),

			getAllProductsWithTotal: H.tryPromise(db.getAllProductsWithTotal),
		}
	},
}) {}
