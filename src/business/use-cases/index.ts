import * as Layer from 'effect/Layer'

import { AddProduct } from './add-product.ts'
import { DeleteAndGetProducts } from './delete-and-get-products.ts'
import { GetProducts } from './get-products.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteAndGetProducts from './delete-and-get-products.ts'
export * as GetProducts from './get-products.ts'

export type All = AddProduct | DeleteAndGetProducts | GetProducts

export const all = Layer.mergeAll(
	AddProduct.layer,
	DeleteAndGetProducts.layer,
	GetProducts.layer,
)
