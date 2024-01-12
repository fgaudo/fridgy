import * as Rx from 'rxjs'

import {
	Controller,
	fromViewModel,
} from '@/core/controller'

import { AddFailure } from './commands/add-failure'
import { DeleteFoodsByIds } from './commands/delete-foods-by-ids'
import { EnqueueProcess } from './commands/enqueue-process'
import { Log } from './commands/log'
import { RemoveProcess } from './commands/remove-process'
import { GetProcesses } from './queries/get-processes'
import { createScheduler } from './schedulers/process'
import { OnChangeProcesses } from './streams/on-change-processes'
import { OnFoods } from './streams/on-foods'
import * as Overview from './view-models/overview'

export type AppUseCases<ID> = Readonly<{
	deleteFoodsByIds: DeleteFoodsByIds<ID>
	enqueueProcess: EnqueueProcess<ID>
	getProcesses: GetProcesses<ID>
	processes$: OnChangeProcesses<ID>
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
		Overview.Model<ID>
	>

	readonly log: Log

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
