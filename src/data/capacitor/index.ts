import { Context, pipe } from 'effect'

import { Eff, H } from '@/core/imports'

import type { Contracts } from '@/app/index'
import type { AddProductDTO } from '@/app/interfaces/write/add-product'

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

export const implementations: (
	deps: Deps,
) => Pick<
	Contracts,
	| 'products'
	| 'addProduct'
	| 'deleteProductsByIds'
> = (deps: Deps) => ({
	addProduct: (product: AddProductDTO) =>
		pipe(
			addProduct(product),
			Eff.provideService(CapacitorService, deps),
		),
	products: pipe(
		products,
		Eff.provideService(CapacitorService, deps),
	),
	deleteProductsByIds: (ids: H.HashSet<string>) =>
		pipe(
			deleteProductsByIds(ids),
			Eff.provideService(CapacitorService, deps),
		),
})
