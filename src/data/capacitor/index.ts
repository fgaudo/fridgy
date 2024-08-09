import { Context, pipe } from 'effect'

import { Eff } from '@/core/imports'

import type { Contracts } from '@/app/index'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin'
import { products } from './read/products'
import { addProduct } from './write/add-product'
import { deleteProductsByIds } from './write/delete-products-by-ids'

interface Deps {
	db: FridgySqlitePlugin
}

export class CapacitorService extends Context.Tag(
	'CapacitorService',
)<CapacitorService, Deps>() {}

export const implementations: Pick<
	Contracts,
	| 'products'
	| 'addProduct'
	| 'deleteProductsByIds'
> = (deps: Deps) => ({
	addProduct: addProduct({ db }),
	products: pipe(
		products,
		Eff.provideService(CapacitorService, deps),
	),
	deleteProductsByIds: deleteProductsByIds({
		db,
	}),
})
