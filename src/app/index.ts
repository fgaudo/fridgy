import {
	Controller,
	fromTransformer,
} from '@/core/controller'

import type { OnProducts } from '@/app/contract/read/on-products'
import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'
import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'
import type { Log } from '@/app/contract/write/log'
import * as AddProduct from '@/app/use-cases/add-product'
import * as ProductList from '@/app/use-cases/product-list'

export interface UseCases {
	addProduct: AddProductCommand
	products$: OnProducts
	appLog: Log
}

export type ProductListController = Controller<
	ProductList.Command,
	ProductList.Model
>

export type AddProductController = Controller<
	AddProduct.Command,
	AddProduct.Model
>

export class App {
	constructor(useCases: UseCases) {
		this.productList = fromTransformer(
			ProductList.transformer,
		)({
			...useCases,
			log: useCases.appLog,
		})

		this.addProduct = fromTransformer(
			AddProduct.transformer,
		)({ ...useCases })
	}

	readonly productList: ProductListController

	readonly addProduct: AddProductController
}
