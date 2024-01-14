import { flip } from 'fp-ts/lib/function'
import { TypeOf } from 'io-ts'
import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import { AddFailure } from './commands/add-failure'
import { AddFood as AddFoodCommand } from './commands/add-food'
import { DeleteFoodsByIds } from './commands/delete-foods-by-ids'
import { EnqueueProcess } from './commands/enqueue-process'
import { Log, LogType } from './commands/log'
import { RemoveProcess } from './commands/remove-process'
import { GetProcesses } from './queries/get-processes'
import { createScheduler } from './schedulers/process'
import { OnChangeProcesses } from './streams/on-change-processes'
import { OnFoods } from './streams/on-foods'
import * as AddFood from './view-models/add-food'
import * as Overview from './view-models/overview'

export type AppUseCases<ID> = Readonly<{
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
}>

export class App<ID> {
	constructor(useCases: AppUseCases<ID>) {
		this.overview = fromViewModel(
			Overview.createViewModel<ID>(),
		)({
			...useCases,
			log: useCases.appLog,
		})

		this.addFood = fromViewModel(
			AddFood.viewModel,
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
		Overview.Model<ID>
	>

	readonly addFood: Controller<
		AddFood.Command,
		AddFood.Model
	>

	readonly log: (
		type: LogType,
		message: string,
	) => void

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
