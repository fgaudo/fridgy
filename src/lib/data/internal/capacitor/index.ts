import { C, L } from '$lib/core/imports.ts';

import { dependencies as appDependencies } from '$lib/app/index.ts';

import {
	type FridgySqlitePlugin,
	registerSqlitePlugin,
} from './fridgy-sqlite-plugin.ts';
import { command as addProductLayer } from './implementations/add-product.ts';
import { command as deleteProductByIdsLayer } from './implementations/delete-products-by-ids.ts';
import { query as getSortedProductsLayer } from './implementations/get-sorted-products.ts';

export type { FridgySqlitePlugin };
export { registerSqlitePlugin };

export class Tag extends C.Tag(
	'CapacitorService',
)<
	Tag,
	{
		db: FridgySqlitePlugin;
	}
>() {}

export const dependencies = appDependencies.pipe(
	L.provide(addProductLayer),
	L.provide(deleteProductByIdsLayer),
	L.provide(getSortedProductsLayer),
);
