import { Eff } from '@/core/imports'

import { ProductsService } from '@/app/interfaces/read/products'
import * as AP from '@/app/use-cases/add-product'
import * as DPBY from '@/app/use-cases/delete-products-by-ids'
import * as PL from '@/app/use-cases/product-list'

import { AddProductService } from './interfaces/write/add-product'
import { DeleteProductsByIdsService } from './interfaces/write/delete-products-by-ids'

export interface Contracts {
	addProduct: AddProductService['Type']
	products: ProductsService['Type']
	deleteProductsByIds: DeleteProductsByIdsService['Type']
}

export class App {
	constructor(contracts: Contracts) {
		this.productList = Eff.provideService(
			PL.useCase,
			ProductsService,
			contracts.products,
		)

		this.addProduct = product =>
			Eff.provideService(
				AP.program(product),
				AddProductService,
				contracts.addProduct,
			)

		this.deleteProductsByIds = ids =>
			Eff.provideService(
				DPBY.command(ids),
				DeleteProductsByIdsService,
				contracts.deleteProductsByIds,
			)
	}

	readonly productList: PL.ProductList

	readonly addProduct: AP.AddProduct

	readonly deleteProductsByIds: DPBY.DeleteProductsByIds
}
