import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'

import { Config } from './config.ts'
import { Db } from './db.ts'
import { command as addProduct } from './resolvers/add-product.ts'
import { command as deleteProductById } from './resolvers/delete-product-by-id.ts'
import { query as getSortedProducts } from './resolvers/get-sorted-products.ts'

export { addProduct, deleteProductById, getSortedProducts }

export const allImplementations = pipe(
	Layer.mergeAll(addProduct, getSortedProducts, deleteProductById),
	Layer.provide(Db.Default),
	Layer.provide(Config.Default),
)
