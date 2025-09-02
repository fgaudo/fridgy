import * as Layer from 'effect/Layer'

import * as AddProduct from './use-cases/add-product.ts'
import * as DeleteProductsByIds from './use-cases/delete-products-by-ids.ts'
import * as GetSortedProducts from './use-cases/get-sorted-products.ts'

export { AddProduct, DeleteProductsByIds, GetSortedProducts }

export type UseCases =
	| AddProduct.AddProduct
	| DeleteProductsByIds.DeleteProductsByIds
	| GetSortedProducts.GetSortedProducts

export const useCasesNoDeps = Layer.mergeAll(
	AddProduct.AddProduct.Default,
	DeleteProductsByIds.DeleteProductsByIds.Default,
	GetSortedProducts.GetSortedProducts.Default,
)
