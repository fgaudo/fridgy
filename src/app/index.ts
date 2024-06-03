import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import type { OnProducts } from '@/app/contract/read/on-products'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'
import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'
import type { Log } from '@/app/contract/write/log'
import * as AddProduct from '@/app/view-models/add-product'
import * as Overview from '@/app/view-models/overview'

export interface UseCases {
	deleteProductsByIds: DeleteProductsByIds
	addProduct: AddProductCommand
	addFailure: AddFailure
	products$: OnProducts
	appLog: Log
}

export type OverviewController = Controller<
	Overview.Command,
	Overview.Model
>

export type AddProductController = Controller<
	AddProduct.Command,
	AddProduct.Model
>

export class App {
	constructor(useCases: UseCases) {
		this.overview = fromViewModel(
			Overview.viewModel,
		)({
			...useCases,
			log: useCases.appLog,
		})

		this.addProduct = fromViewModel(
			AddProduct.viewModel,
		)({ ...useCases })
	}

	readonly overview: OverviewController

	readonly addProduct: AddProductController
}
