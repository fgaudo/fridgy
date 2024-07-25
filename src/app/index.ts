import type { OnProducts } from '@/app/interfaces/read/on-products'
import type { AddProduct as AddProductCommand } from '@/app/interfaces/write/add-product'
import type { DeleteProductsByIds as DeleteProductsByIdsCommand } from '@/app/interfaces/write/delete-products-by-ids'
import type { Log } from '@/app/interfaces/write/log'
import * as AP from '@/app/use-cases/add-product'
import * as DPBY from '@/app/use-cases/delete-products-by-ids'
import * as PL from '@/app/use-cases/product-list'

export interface UseCases {
	addProduct: AddProductCommand
	products: OnProducts
	deleteProductsByIds: DeleteProductsByIdsCommand
	appLog: Log
	uiLog: Log
}

export class App {
	constructor(useCases: UseCases) {
		this.productList = PL.controller({
			...useCases,
			log: useCases.appLog,
		})

		this.addProduct = AP.command({
			...useCases,
		})

		this.log = useCases.uiLog

		this.deleteProductsByIds = DPBY.command({
			...useCases,
		})
	}

	readonly productList: PL.ProductListController

	readonly addProduct: AP.AddProduct

	readonly deleteProductsByIds: DPBY.DeleteProductsByIds

	readonly log: Log
}
