import * as Layer from 'effect/Layer'

import * as _AddProduct from './add-product.ts'
import * as _DeleteAndGetProducts from './delete-and-get-products.ts'
import * as _GetProducts from './get-products.ts'

export * as DeleteAndGetProducts from './delete-and-get-products.ts'
export * as AddProduct from './add-product.ts'
export * as GetProducts from './get-products.ts'

export type All =
	| _GetProducts.GetProducts
	| _DeleteAndGetProducts.DeleteAndGetProducts
	| _AddProduct.AddProduct

export const all = Layer.mergeAll(
	_GetProducts.GetProducts.Default,
	_DeleteAndGetProducts.DeleteAndGetProducts.Default,
	_AddProduct.AddProduct.Default,
)
