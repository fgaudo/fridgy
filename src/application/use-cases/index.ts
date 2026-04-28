import * as Layer from 'effect/Layer'

import { AddProduct } from './add-product.ts'
import { DeleteProductsByIds } from './delete-products-by-ids.ts'
import { GetProducts } from './get-products.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteProductsByIds from './delete-products-by-ids.ts'
export * as GetProducts from './get-products.ts'

export type All = AddProduct | DeleteProductsByIds | GetProducts

export const all = Layer.mergeAll(
  AddProduct.layer,
  DeleteProductsByIds.layer,
  GetProducts.layer,
)
