import { either as E } from 'fp-ts'

export interface FridgySqlitePlugin {
	openDB(data: {
		version: string
		name: string
	}): Promise<E.Either<string, void>>

	getAllProductsWithTotal(): Promise<
		E.Either<string, unknown>
	>

	deleteProductsByIds(data: {
		ids: number[]
	}): Promise<E.Either<string, void>>
}
