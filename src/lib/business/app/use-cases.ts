import { L } from '$lib/core/imports.ts'

import * as AddProduct from './use-cases/add-product.ts'
import * as DeleteProductsByIds from './use-cases/delete-products-by-ids.ts'
import * as GetSortedProducts from './use-cases/get-sorted-products.ts'
import * as LogWithLevel from './use-cases/log-with-level.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
	LogWithLevel,
}

export type UseCases = L.Layer<
	| AddProduct.AddProduct
	| DeleteProductsByIds.DeleteProductsByIds
	| GetSortedProducts.GetSortedProducts
	| LogWithLevel.Resolver
>

export const useCasesNoDeps = L.mergeAll(
	AddProduct.AddProduct.Default,
	DeleteProductsByIds.DeleteProductsByIds.Default,
	GetSortedProducts.GetSortedProducts.Default,
)
