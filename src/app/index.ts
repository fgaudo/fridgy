import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import type { OnChangeProcesses } from '@/app/contract/read/on-change-processes'
import type { OnProducts } from '@/app/contract/read/on-products'
import type { OnceProcesses } from '@/app/contract/read/once-processes'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'
import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'
import type { EnqueueProcess } from '@/app/contract/write/enqueue-process'
import type { Log } from '@/app/contract/write/log'
import type { RemoveProcess } from '@/app/contract/write/remove-process'
import { createScheduler } from '@/app/schedulers/process'
import * as AddProduct from '@/app/view-models/add-product'
import * as Overview from '@/app/view-models/overview'

export interface UseCases<ID> {
	deleteProductsByIds: DeleteProductsByIds<ID>
	enqueueProcess: EnqueueProcess<ID>
	getProcesses: OnceProcesses<ID>
	processes$: OnChangeProcesses<ID>
	addProduct: AddProductCommand
	addFailure: AddFailure
	removeProcess: RemoveProcess<ID>
	products$: OnProducts<ID>
	appLog: Log
}

export type OverviewController<ID> = Controller<
	Overview.Command<ID>,
	Overview.Model<ID>
>

export type AddProductController = Controller<
	AddProduct.Command,
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
			AddProduct.createViewModel,
		)({ ...useCases })

		this.scheduler = createScheduler<ID>()({
			interval: 5000,
			...useCases,
		})
	}

	init(): void {
		if (this.isRunning) {
			return
		}

		this.isRunning = true

		this.scheduler.subscribe()
	}

	readonly overview: OverviewController<ID>

	readonly addProduct: AddProductController

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
