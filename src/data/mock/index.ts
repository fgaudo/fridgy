import { reader as R } from 'fp-ts'

import type { Contracts } from '@/app/index'

import { products } from './read/products'
import { addProduct } from './write/add-product'
import { deleteProductByIds } from './write/delete-products-by-ids'

export interface Deps {
	dataLogPrefix: string
}

export const useCases: R.Reader<
	Deps,
	Pick<
		Contracts,
		| 'products'
		| 'addProduct'
		| 'deleteProductsByIds'
	>
> = ({ dataLogPrefix: prefix }) => ({
	addProduct: addProduct(undefined),
	products: products({
		prefix,
	}),
	deleteProductsByIds: deleteProductByIds({}),
})
