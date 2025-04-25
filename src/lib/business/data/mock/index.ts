import { L } from '$lib/core/imports.ts'

import { command as addProduct } from './implementations/add-product.ts'
import { command as deleteProductsByIds } from './implementations/delete-products-by-ids.ts'
import { query as getSortedProducts } from './implementations/get-sorted-products.ts'

export {
	addProduct,
	deleteProductsByIds,
	getSortedProducts,
}

export const allImplementations = L.mergeAll(
	addProduct,
	getSortedProducts,
	deleteProductsByIds,
)
