import * as Layer from 'effect/Layer'

import { DbPlugin } from './db-plugin.ts'
import { command as addProduct } from './resolvers/add-product.ts'
import { command as deleteProductById } from './resolvers/delete-product-by-id.ts'
import { query as getSortedProducts } from './resolvers/get-sorted-products.ts'

export { addProduct, deleteProductById, getSortedProducts }

export const allImplementations = Layer.provide(
	Layer.mergeAll(addProduct, deleteProductById, getSortedProducts),
	DbPlugin.Default,
)
