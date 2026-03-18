import type { UseCases } from '../../screens/home/use-cases.ts'
import type { AddProduct } from './add-product.ts'
import type { GetProducts } from './get-products.ts'

export * as AddProduct from './add-product.ts'
export * as DeleteProductById from './get-products.ts'
export * as GetProducts from '../../screens/home/use-cases.ts'

export type All = AddProduct | GetProducts | UseCases
