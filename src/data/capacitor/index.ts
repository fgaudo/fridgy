import { C, L } from '@/core/imports.ts'

import { app } from '@/app/index.ts'

import type { FridgySqlitePlugin } from './fridgy-sqlite-plugin.ts'
import { command as addProduct } from './implementations/add-product.ts'
import { command as deleteProductByIds } from './implementations/delete-products-by-ids.ts'
import { query as getSortedProducts } from './implementations/get-sorted-products.ts'

export class CapacitorService extends C.Tag(
	'CapacitorService',
)<
	CapacitorService,
	{
		db: FridgySqlitePlugin
	}
>() {}

export const appLive = app.pipe(
	L.provide(addProduct),
	L.provide(deleteProductByIds),
	L.provide(getSortedProducts),
)
