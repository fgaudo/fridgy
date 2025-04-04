import { L } from '$lib/core/imports.ts';

import { dependencies as appDependencies } from '$lib/app/index.ts';

import { command as addProduct } from './implementations/add-product.ts';
import { command as deleteProductsByIds } from './implementations/delete-products-by-ids.ts';
import { query as getSortedProducts } from './implementations/get-sorted-products.ts';

export const dependencies = appDependencies.pipe(
	L.provide(addProduct),
	L.provide(getSortedProducts),
	L.provide(deleteProductsByIds),
);
