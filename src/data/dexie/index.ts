import type Dexie from 'dexie'
import { reader as R } from 'fp-ts'

import type { UseCases } from '@/app/index'

import { products } from './read/products'
import { addProduct } from './write/add-product'
import { deleteProductsByIds } from './write/delete-products-by-ids'

export interface Deps {
	db: Dexie
	prefix: string
}

export const useCases: R.Reader<
	Deps,
	Pick<
		UseCases,
		| 'products'
		| 'addProduct'
		| 'deleteProductsByIds'
	>
> = ({ db, prefix }) => ({
	addProduct: addProduct({ db }),
	products: products({
		db,
		prefix,
	}),
	deleteProductsByIds: deleteProductsByIds({
		db,
	}),
})
