import type { Contracts } from '@/app/index'

import { query as getSortedProducts } from './read/get-sorted-products'
import { command as addProduct } from './write/add-product'
import { command as deleteProductsByIds } from './write/delete-products-by-ids'

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
