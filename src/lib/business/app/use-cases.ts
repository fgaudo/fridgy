import { L } from '$lib/core/imports.ts'

import { UiLogWithLevel } from './queries.ts'
import * as AddProduct from './use-cases/add-product.ts'
import * as DeleteProductsByIds from './use-cases/delete-products-by-ids.ts'
import * as GetSortedProducts from './use-cases/get-sorted-products.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
	UiLogWithLevel,
}

export type UseCases = L.Layer<
	| AddProduct.AddProduct
	| DeleteProductsByIds.DeleteProductsByIds
	| GetSortedProducts.GetSortedProducts
	| UiLogWithLevel.UiLogWithLevel
>

export const useCasesNoDeps = L.mergeAll(
	AddProduct.AddProduct.Default,
	DeleteProductsByIds.DeleteProductsByIds.Default,
	GetSortedProducts.GetSortedProducts.Default,
)
