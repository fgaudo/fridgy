import type Dexie from 'dexie'
import { reader as R } from 'fp-ts'

import type { Contracts } from '@/app/index'
import type { Log } from '@/app/interfaces/write/log'

import { products } from './read/products'
import { addProduct } from './write/add-product'
import { deleteProductsByIds } from './write/delete-products-by-ids'

export interface Deps {
	db: Dexie
	log: Log
}

export const implementations: R.Reader<
	Deps,
	Pick<
		Contracts,
		| 'products'
		| 'addProduct'
		| 'deleteProductsByIds'
	>
> = ({ db, log }) => ({
	addProduct: addProduct({ db, log }),
	products: products({
		db,
		log,
	}),
	deleteProductsByIds: deleteProductsByIds({
		db,
		log,
	}),
})
