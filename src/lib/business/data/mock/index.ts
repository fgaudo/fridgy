import { L, pipe } from '$lib/core/imports.ts'

import { Config } from './config.ts'
import { Db } from './db.ts'
import { command as addProduct } from './resolvers/add-product.ts'
import { command as deleteProductById } from './resolvers/delete-product-by-id.ts'
import { query as getSortedProducts } from './resolvers/get-sorted-products.ts'

export { addProduct, deleteProductById, getSortedProducts }

export const allImplementations = pipe(
	L.mergeAll(addProduct, getSortedProducts, deleteProductById),
	L.provide(Db.Default),
	L.provide(Config.Default),
)
