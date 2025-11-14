import * as Layer from 'effect/Layer'

import { Db } from './db.ts'
import { command as addProduct } from './query.add-product.ts'
import { command as deleteProductById } from './query.delete-product-by-id.ts'
import { query as getSortedProducts } from './query.get-sorted-products.ts'

export * from './config.ts'

export const queries = Layer.provide(
	Layer.mergeAll(getSortedProducts, addProduct, deleteProductById),
	Db.Default,
)
