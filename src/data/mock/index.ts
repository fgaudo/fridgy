import type { Contracts } from '@/app/index.ts'

import { query as getSortedProducts } from './read/get-sorted-products.ts'
import { command as addProduct } from './write/add-product.ts'
import { command as deleteProductsByIds } from './write/delete-products-by-ids.ts'

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
