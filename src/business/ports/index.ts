import type { AddProduct } from './add-product.ts'
import type { DeleteProductById } from './delete-product-by-id.ts'
import type { GetProducts } from './get-products.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteProductById from './delete-product-by-id.ts'
export * as GetProducts from './get-products.ts'

export type All = AddProduct | DeleteProductById | GetProducts
