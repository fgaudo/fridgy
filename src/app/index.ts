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

export interface UseCases<ID> {
	deleteProductsByIds: DeleteProductsByIds<ID>
	addProduct: AddProductCommand<ID>
	addFailure: AddFailure
	products$: OnProducts<ID>
	appLog: Log
}

export type OverviewController<ID> = Controller<
	Overview.Command<ID>,
	Overview.Model<ID>
>

export type AddProductController<ID> = Controller<
	AddProduct.Command<ID>,
	AddProduct.Model
>

export class App<ID> {
	constructor(useCases: UseCases<ID>) {
		this.overview = fromViewModel(
			Overview.createViewModel<ID>(),
		)({
			...useCases,
			log: useCases.appLog,
		})

		this.addProduct = fromViewModel(
			AddProduct.createViewModel<ID>(),
		)({ ...useCases })
	}

	readonly overview: OverviewController<ID>

	readonly addProduct: AddProductController<ID>
}
