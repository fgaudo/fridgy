import { either as E } from 'fp-ts'

export interface FridgySqlitePlugin {
	openDB(data: {
		version: string
		name: string
	}): Promise<E.Either<string, void>>

	getAllProductsWithTotal(): Promise<
		E.Either<string, unknown>
	>

	addProduct(data: {
		product: {
			name: string
			creationDate: number
			expirationDate?: number
		}
	}): Promise<E.Either<string, void>>

	deleteProductsByIds(data: {
		ids: readonly number[]
	}): Promise<E.Either<string, void>>
}
