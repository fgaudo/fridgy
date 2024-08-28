import { Eff, HS } from '@/core/imports.js'

import { ProductsService } from './interfaces/read/get-sorted-products.js'
import { AddProductService } from './interfaces/write/add-product.js'
import { DeleteProductsByIdsService } from './interfaces/write/delete-products-by-ids.js'
import {
	type AddProductDTO,
	useCase as addProduct,
} from './use-cases/add-product.js'
import { useCase as deleteProductsByIds } from './use-cases/delete-products-by-ids.js'
import { useCase as getSortedProducts } from './use-cases/get-sorted-products.js'

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
