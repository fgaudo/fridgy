import * as Layer from 'effect/Layer'

import * as DeleteProductsByIds from './delete-products-by-ids-and-retrieve.ts'
import * as GetSortedProducts from './get-sorted-products.ts'

export type UseCases =
	| GetSortedProducts.GetSortedProducts
	| DeleteProductsByIds.DeleteProductsByIdsAndRetrieve

export const useCases = Layer.mergeAll(
	GetSortedProducts.GetSortedProducts.Default,
	DeleteProductsByIds.DeleteProductsByIdsAndRetrieve.Default,
)
