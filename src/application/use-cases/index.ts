import * as Layer from 'effect/Layer'

import { AddProduct } from './add-product.ts'
import { DeleteProductsByIds } from './delete-products-by-ids.ts'
import { GetProducts, ProductChanges } from './products.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteProductsByIds from './delete-products-by-ids.ts'
export * as Products from './products.ts'

export type All = AddProduct | DeleteProductsByIds | GetProducts | ProductChanges

export const all = Layer.mergeAll(
  AddProduct.layer,
  DeleteProductsByIds.layer,
  GetProducts.layer,
  ProductChanges.layer,
)
