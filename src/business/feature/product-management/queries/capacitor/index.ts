import * as Layer from 'effect/Layer'

import { Db } from './db.ts'
import { command as addProduct } from './query.add-product.ts'
import { command as deleteProduct } from './query.delete-product-by-id.ts'
import { query as getProducts } from './query.get-sorted-products.ts'

export const queries = Layer.provide(
	Layer.mergeAll(getProducts, deleteProduct, addProduct),
	Db.Default,
)
