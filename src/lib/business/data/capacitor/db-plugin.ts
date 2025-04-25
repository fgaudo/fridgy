import { registerPlugin } from '@capacitor/core'

import { Eff } from '$lib/core/imports.ts'

interface FridgySqlitePlugin {
	getAllProductsWithTotal(): Promise<unknown>

	addProduct(data: {
		product: {
			name: string
			creationDate: number
			expirationDate: number | undefined
		}
	}): Promise<unknown>

	deleteProductsByIds(data: {
		ids: readonly number[]
	}): Promise<unknown>
}

export class DbPlugin extends Eff.Service<DbPlugin>()(
	'DbPlugin',
	{
		sync: () => ({
			db: registerPlugin<FridgySqlitePlugin>(
				'FridgySqlitePlugin',
			),
		}),
	},
) {}
