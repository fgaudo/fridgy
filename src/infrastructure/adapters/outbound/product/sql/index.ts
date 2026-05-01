import * as Layer from 'effect/Layer'
import { addProductLayer } from '@/infra/adapters/outbound/product/sql/add-product.ts'
import { deleteProductsLayer } from '@/infra/adapters/outbound/product/sql/delete-product-by-id.ts'
import { layer as productReadLayer } from '@/infra/adapters/outbound/product/sql/product-read.ts'

export const layer = Layer.mergeAll(
  addProductLayer,
  deleteProductsLayer,
  productReadLayer,
)
