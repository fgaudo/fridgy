import { reader as R } from 'fp-ts'

import type { UseCases } from '@/app/index'

import type { FridgyDexie } from './dexie'
import { products } from './read/products'
import { addProduct } from './write/add-product'

export interface Deps {
	db: FridgyDexie
	prefix: string
}

export const useCases: R.Reader<
	Deps,
	Pick<UseCases, 'products' | 'addProduct'>
> = ({ db, prefix }) => ({
	addProduct: addProduct({ db }),
	products: products({
		db,
		prefix,
	}),
})
