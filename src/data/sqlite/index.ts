import { reader as R } from 'fp-ts'
import * as Rx from 'rxjs'

import type { UseCases } from '@/app/index'

import { products } from './read/products'
import { addProduct } from './write/add-product'

export interface Deps {
	db: SQLitePlugin.Database
	prefix: string
}

export const useCases: R.Reader<
	Deps,
	Pick<UseCases, 'products' | 'addProduct'>
> = ({ db, prefix }) => ({
	addProduct: addProduct({ db }),
	products: products({
		db,
		events: Rx.of(undefined),
		prefix,
	}),
})
