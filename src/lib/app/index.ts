import { L } from '$lib/core/imports.ts';

import {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
} from './use-cases.ts';

export type Dependencies = L.Layer<
	| AddProduct.Tag
	| DeleteProductsByIds.Tag
	| GetSortedProducts.Tag
>;

export const dependencies = L.mergeAll(
	AddProduct.useCase,
	DeleteProductsByIds.useCase,
	GetSortedProducts.useCase,
);
