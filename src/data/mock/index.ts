import type { Contracts } from '@/app/index'

import { products } from './read/products'
import { addProduct } from './write/add-product'
import { deleteProductsByIds } from './write/delete-products-by-ids'

export interface Deps {
	dataLogPrefix: string
}

export const useCases: (
	deps: Deps,
) => Pick<
	Contracts,
	| 'products'
	| 'addProduct'
	| 'deleteProductsByIds'
> = () => ({
	addProduct,
	products,
	deleteProductsByIds,
})
