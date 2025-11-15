import * as Layer from 'effect/Layer'

import * as _AddProduct from './add-product.ts'
import * as _DeleteProductsByIdsAndRetrieve from './delete-products-by-ids-and-retrieve.ts'
import * as _GetSortedProducts from './get-sorted-products.ts'

export * as DeleteProductsByIdsAndRetrieve from './delete-products-by-ids-and-retrieve.ts'
export * as AddProduct from './add-product.ts'
export * as GetSortedProducts from './get-sorted-products.ts'

export type All =
	| _GetSortedProducts.GetSortedProducts
	| _DeleteProductsByIdsAndRetrieve.DeleteProductsByIdsAndRetrieve
	| _AddProduct.AddProduct

export const all = Layer.mergeAll(
	_GetSortedProducts.GetSortedProducts.Default,
	_DeleteProductsByIdsAndRetrieve.DeleteProductsByIdsAndRetrieve.Default,
	_AddProduct.AddProduct.Default,
)
