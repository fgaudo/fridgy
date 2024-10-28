import { Context, flow, pipe } from 'effect'

import { Eff } from '@/core/imports.ts'

import type { Contracts } from '@/app/index.ts'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin.ts'
import { query as getSortedProducts } from './read/get-sorted-products.ts'
import { command as addProduct } from './write/add-product.ts'
import { command as deleteProductByIds } from './write/delete-products-by-ids.ts'

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
