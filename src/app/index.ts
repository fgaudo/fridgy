import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import type { GetProcesses } from '@/app/contract/read/get-processes'
import type { OnChangeProcesses } from '@/app/contract/read/on-change-processes'
import type { OnProducts } from '@/app/contract/read/on-products'
import type { AddFailure } from '@/app/contract/write/add-failure'
import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'
import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'
import type { EnqueueProcess } from '@/app/contract/write/enqueue-process'
import type {
	Log,
	LogType,
} from '@/app/contract/write/log'
import type { RemoveProcess } from '@/app/contract/write/remove-process'
import { createScheduler } from '@/app/schedulers/process'
import * as AddProduct from '@/app/view-models/add-product'
import * as Overview from '@/app/view-models/overview'

export interface AppUseCases<ID> {
	deleteProductsByIds: DeleteProductsByIds<ID>
	enqueueProcess: EnqueueProcess<ID>
	getProcesses: GetProcesses<ID>
	processes$: OnChangeProcesses<ID>
	addProduct: AddProductCommand
	addFailure: AddFailure
	removeProcess: RemoveProcess<ID>
	products$: OnProducts<ID>
	uiLog: Log
	appLog: Log
}

export class App<ID> {
	constructor(useCases: AppUseCases<ID>) {
		this.overview = fromViewModel(
			Overview.createViewModel<ID>(),
		)({
			...useCases,
			log: useCases.appLog,
		})

		this.addProduct = fromViewModel(
			AddProduct.viewModel,
		)({ ...useCases })

		this.log = useCases.uiLog
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

	readonly overview: Controller<
		Overview.Command<ID>,
		Overview.Model<ID>,
		Overview.Init
	>

	readonly addProduct: Controller<
		AddProduct.Command,
		AddProduct.Model,
		AddProduct.Init
	>

	readonly log: Log

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
