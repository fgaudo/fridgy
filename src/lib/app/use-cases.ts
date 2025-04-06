import { L } from '$lib/core/imports.ts';

import * as AddProduct from './internal/use-cases/add-product.ts';
import * as DeleteProductsByIds from './internal/use-cases/delete-products-by-ids.ts';
import * as GetSortedProducts from './internal/use-cases/get-sorted-products.ts';

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
};

export type UseCases = L.Layer<
	| AddProduct.Tag
	| DeleteProductsByIds.Tag
	| GetSortedProducts.Tag
>;

export const useCases = L.mergeAll(
	AddProduct.useCase,
	DeleteProductsByIds.useCase,
	GetSortedProducts.useCase,
);
