import type { Contracts } from '@/app/index.js'

import { query as getSortedProducts } from './read/get-sorted-products.js'
import { command as addProduct } from './write/add-product.js'
import { command as deleteProductsByIds } from './write/delete-products-by-ids.js'

type Deps = object

export const implementations: (
	deps: Deps,
) => Pick<
	Contracts,
	| 'getSortedProducts'
	| 'addProduct'
	| 'deleteProductsByIds'
> = () => ({
	addProduct,
	getSortedProducts,
	deleteProductsByIds,
})
