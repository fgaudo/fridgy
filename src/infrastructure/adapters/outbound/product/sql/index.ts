import { addProductLayer } from '@/infra/adapters/outbound/product/sql/add-product.ts'
import { deleteProductsLayer } from '@/infra/adapters/outbound/product/sql/delete-product-by-id.ts'
import { getProductsLayer } from '@/infra/adapters/outbound/product/sql/get-products.ts'
import * as Layer from 'effect/Layer'

export const layer = Layer.mergeAll(addProductLayer, deleteProductsLayer, getProductsLayer)
