export interface FridgySqlitePlugin {
	openDB(data: {
		version: number
		name: string
	}): Promise<unknown>

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
