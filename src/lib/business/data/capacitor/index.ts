import { L } from '$lib/core/imports.ts';

import { DbPlugin } from './db-plugin.ts';
import { command as addProduct } from './implementations/add-product.ts';
import { command as deleteProductById } from './implementations/delete-products-by-ids.ts';
import { query as getSortedProducts } from './implementations/get-sorted-products.ts';

export {
	addProduct,
	deleteProductById,
	getSortedProducts,
};

export const allImplementations = L.provide(
	L.mergeAll(
		addProduct,
		deleteProductById,
		getSortedProducts,
	),
	DbPlugin.Default,
);
