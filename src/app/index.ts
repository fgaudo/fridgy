import type { Products } from '@/app/interfaces/read/products'
import type { AddProduct as AddProductCommand } from '@/app/interfaces/write/add-product'
import type { DeleteProductsByIds as DeleteProductsByIdsCommand } from '@/app/interfaces/write/delete-products-by-ids'
import type { Log } from '@/app/interfaces/write/log'
import * as AP from '@/app/use-cases/add-product'
import * as DPBY from '@/app/use-cases/delete-products-by-ids'
import * as PL from '@/app/use-cases/product-list'

export interface Contracts {
	addProduct: AddProductCommand
	products: Products
	deleteProductsByIds: DeleteProductsByIdsCommand
	appLog: Log
	uiLog: Log
}

export class App {
	constructor(contracts: Contracts) {
		this.productList = PL.useCase({
			...contracts,
			log: contracts.appLog,
		})

		this.addProduct = AP.command({
			...contracts,
		})

		this.log = contracts.uiLog

		this.deleteProductsByIds = DPBY.command({
			...contracts,
		})
	}

	readonly productList: PL.ProductList

	readonly addProduct: AP.AddProduct

	readonly deleteProductsByIds: DPBY.DeleteProductsByIds

	readonly log: Log
}
