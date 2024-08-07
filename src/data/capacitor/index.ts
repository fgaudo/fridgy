import { reader as R } from 'fp-ts'

import type { Contracts } from '@/app/index'
import type { Log } from '@/app/interfaces/write/log'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin'
import { products } from './read/products'

export interface Deps {
	db: FridgySqlitePlugin
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
