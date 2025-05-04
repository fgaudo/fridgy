import { L, pipe } from '$lib/core/imports.ts'

import { Config } from './config.ts'
import { Db } from './db.ts'
import { command as addProduct } from './implementations/add-product.ts'
import { command as deleteProductsByIds } from './implementations/delete-products-by-ids.ts'
import { query as getSortedProducts } from './implementations/get-sorted-products.ts'

export {
	addProduct,
	deleteProductsByIds,
	getSortedProducts,
}

export const allImplementations = pipe(
	L.mergeAll(
		addProduct,
		getSortedProducts,
		deleteProductsByIds,
	),
	L.provide(Db.Default),
	L.provide(Config.Default),
)
