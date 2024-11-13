import { Eff, HS } from '@/core/imports.ts'

import { ProductsService } from './interfaces/read/get-sorted-products.ts'
import { AddProductService } from './interfaces/write/add-product.ts'
import { DeleteProductsByIdsService } from './interfaces/write/delete-products-by-ids.ts'
import {
	type AddProductDTO,
	useCase as addProduct,
} from './use-cases/add-product.ts'
import { useCase as deleteProductsByIds } from './use-cases/delete-products-by-ids.ts'
import { useCase as getSortedProducts } from './use-cases/get-sorted-products.ts'

export interface Contracts {
	addProduct: AddProductService['Type']
	getSortedProducts: ProductsService['Type']
	deleteProductsByIds: DeleteProductsByIdsService['Type']
}

export type App = ReturnType<typeof createApp>

export const createApp = (
	contracts: Contracts,
) => ({
	productList: Eff.provideService(
		getSortedProducts,
		ProductsService,
		contracts.getSortedProducts,
	),

	addProduct: (product: AddProductDTO) =>
		Eff.provideService(
			addProduct(product),
			AddProductService,
			contracts.addProduct,
		),

	deleteProductsByIds: (
		ids: HS.HashSet<string>,
	) =>
		Eff.provideService(
			deleteProductsByIds(ids),
			DeleteProductsByIdsService,
			contracts.deleteProductsByIds,
		),
})
