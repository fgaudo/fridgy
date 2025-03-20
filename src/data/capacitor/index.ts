import { C, L } from '@/core/imports.ts'

import { app } from '@/app/index.ts'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin.ts'
import { command as addProductLayer } from './implementations/add-product.ts'
import { command as deleteProductByIdsLayer } from './implementations/delete-products-by-ids.ts'
import { query as getSortedProductsLayer } from './implementations/get-sorted-products.ts'

export class CapacitorService extends C.Tag(
	'CapacitorService',
)<
	CapacitorService,
	{
		db: FridgySqlitePlugin
	}
>() {}

export const appLive = app.pipe(
	L.provide(addProductLayer),
	L.provide(deleteProductByIdsLayer),
	L.provide(getSortedProductsLayer),
)
