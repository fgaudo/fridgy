import * as Layer from 'effect/Layer'

import { layer as addProduct } from './add-product.ts'
import { layer as deleteProductsByIds } from './delete-products-by-ids.ts'
import { productsRead } from './products-read.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteProductsByIds from './delete-products-by-ids.ts'
export * as Products from './products-read.ts'

export const all = Layer.mergeAll(
  addProduct,
  deleteProductsByIds,
  productsRead,
)
