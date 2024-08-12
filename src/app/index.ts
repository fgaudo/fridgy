import { Eff, HS } from '@/core/imports'

import { ProductsService } from '@/app/interfaces/read/get-sorted-products'
import {
	type AddProductDTO,
	useCase as addProduct,
} from '@/app/use-cases/add-product'
import { useCase as deleteProductsByIds } from '@/app/use-cases/delete-products-by-ids'
import { useCase as getSortedProducts } from '@/app/use-cases/get-sorted-products'

import { AddProductService } from './interfaces/write/add-product'
import { DeleteProductsByIdsService } from './interfaces/write/delete-products-by-ids'

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
