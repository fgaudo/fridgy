import * as Layer from 'effect/Layer'
import { addProductLayer } from './add-product.ts'
import { deleteProductsLayer } from './delete-product-by-id.ts'

export const layer = Layer.mergeAll(
  addProductLayer,
  deleteProductsLayer,
)
