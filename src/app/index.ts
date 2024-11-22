import { L } from '@/core/imports.ts'

import {
	AddProductUseCase,
	useCase as addProduct,
} from './use-cases/add-product.ts'
import {
	DeleteProductsByIdsUseCase,
	useCase as deleteProductsByIds,
} from './use-cases/delete-products-by-ids.ts'
import {
	GetSortedProductsUseCase,
	useCase as getSortedProducts,
} from './use-cases/get-sorted-products.ts'

export type App = L.Layer<
	| AddProductUseCase
	| DeleteProductsByIdsUseCase
	| GetSortedProductsUseCase
>

export const app = L.mergeAll(
	addProduct,
	deleteProductsByIds,
	getSortedProducts,
)
