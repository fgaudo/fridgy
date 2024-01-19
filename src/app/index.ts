import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import type { AddFailure } from './commands/add-failure'
import type { AddFood as AddFoodCommand } from './commands/add-food'
import type { DeleteFoodsByIds } from './commands/delete-foods-by-ids'
import type { EnqueueProcess } from './commands/enqueue-process'
import type { Log, LogType } from './commands/log'
import type { RemoveProcess } from './commands/remove-process'
import type { GetProcesses } from './queries/get-processes'
import { createScheduler } from './schedulers/process'
import type { OnChangeProcesses } from './streams/on-change-processes'
import type { OnFoods } from './streams/on-foods'
import * as AddProduct from './view-models/add-product'
import * as Overview from './view-models/overview'

export interface AppUseCases<ID> {
	deleteFoodsByIds: DeleteFoodsByIds<ID>
	enqueueProcess: EnqueueProcess<ID>
	getProcesses: GetProcesses<ID>
	processes$: OnChangeProcesses<ID>
	addFood: AddFoodCommand
	addFailure: AddFailure
	removeProcess: RemoveProcess<ID>
	foods$: OnFoods<ID>
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

		this.addFood = fromViewModel(
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

	readonly addFood: Controller<
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
