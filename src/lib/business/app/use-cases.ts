import { L } from '$lib/core/imports.ts'

import * as AddProduct from './use-cases/add-product.ts'
import * as DeleteProductsByIds from './use-cases/delete-products-by-ids.ts'
import * as GetSortedProducts from './use-cases/get-sorted-products.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
}

export type UseCases = L.Layer<
	| AddProduct.Service
	| DeleteProductsByIds.Service
	| GetSortedProducts.Service
>

export const useCasesNoDeps = L.mergeAll(
	AddProduct.Service.Default,
	DeleteProductsByIds.Service.Default,
	GetSortedProducts.Service.Default,
)
