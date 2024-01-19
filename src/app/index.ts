import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import type { AddFailure } from './commands/add-failure'
import type { AddProduct as AddProductCommand } from './commands/add-product'
import type { DeleteProductsByIds } from './commands/delete-products-by-ids'
import type { EnqueueProcess } from './commands/enqueue-process'
import type { Log, LogType } from './commands/log'
import type { RemoveProcess } from './commands/remove-process'
import type { GetProcesses } from './queries/get-processes'
import { createScheduler } from './schedulers/process'
import type { OnChangeProcesses } from './streams/on-change-processes'
import type { OnProducts } from './streams/on-products'
import * as AddProduct from './view-models/add-product'
import * as Overview from './view-models/overview'

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

		this.log = (type, message) => {
			useCases.uiLog(type, message)()
		}

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

	readonly log: (
		type: LogType,
		message: string,
	) => void

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
