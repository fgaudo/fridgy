import { Context, flow, pipe } from 'effect'

import { Eff } from '@/core/imports.js'

import type { Contracts } from '@/app/index.js'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin.js'
import { query as getSortedProducts } from './read/get-sorted-products.js'
import { command as addProduct } from './write/add-product.js'
import { command as deleteProductByIds } from './write/delete-products-by-ids.js'

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
	| 'getSortedProducts'
	| 'addProduct'
	| 'deleteProductsByIds'
> = (deps: Deps) => ({
	addProduct: flow(
		addProduct,
		Eff.provideService(CapacitorService, deps),
	),
	getSortedProducts: pipe(
		getSortedProducts,
		Eff.provideService(CapacitorService, deps),
	),
	deleteProductsByIds: flow(
		deleteProductByIds,
		Eff.provideService(CapacitorService, deps),
	),
})
