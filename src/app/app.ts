import {
	readonlyArray as RoA,
	readonlySet as RoS,
	task as T,
	taskEither as TE
} from 'fp-ts'
import { observable as O } from 'fp-ts-rxjs'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { DeleteFoodsByIds } from '@/app/commands/delete-foods-by-ids'
import { OnFoods } from '@/app/commands/foods'
import { Log } from '@/app/commands/log'
import {
	EnqueueProcess,
	GetProcesses,
	OnChangeProcesses,
	RemoveProcess,
	processesOrd
} from '@/app/commands/processes'
import { OverviewController, overview } from '@/app/controllers/overview'

import { AddFailure } from './commands/failures'

type AppParams = Readonly<{
	deleteFoodsByIds: DeleteFoodsByIds
	enqueueProcess: EnqueueProcess
	getProcesses: GetProcesses
	processes$: OnChangeProcesses
	addFailure: AddFailure
	removeProcess: RemoveProcess
	foods$: OnFoods
	uiLog: Log
	appLog: Log
}>

/**
 * This is the main entrypoint of our App. It encapsules all the features needed for our app to work.
 * The data layer instantiates this class with the specific implementations of the features.
 * The ui layer then uses the instance in order to provide the features to the users.
 */
export class App {
	constructor({
		deleteFoodsByIds,
		foods$,
		uiLog,
		processes$,
		appLog,
		removeProcess,
		getProcesses,
		addFailure,
		enqueueProcess
	}: AppParams) {
		this.overview = overview({
			enqueueProcess,
			addFailure,
			foods$,
			processes$,
			log: appLog
		})
		this.log = uiLog
		this.removeProcess = removeProcess
		this.getProcesses = getProcesses
		this.deleteFoodsByIds = deleteFoodsByIds
	}

	init(): void {
		if (this.isRunning) {
			return
		}

		this.isRunning = true

		pipe(
			Rx.interval(3000),
			Rx.exhaustMap(() => O.fromTask(this.runProcesses())),
			Rx.catchError(() =>
				O.fromTask(
					this.addFailure({
						name: 'critical error',
						message: 'This is a bug. Please send a report'
					})
				)
			)
		).subscribe()
	}

	readonly overview: OverviewController
	readonly log: Log

	private isRunning = false

	private runProcesses(): T.Task<unknown> {
		return pipe(
			this.getProcesses,
			TE.map(RoS.toReadonlyArray(processesOrd)),
			TE.map(
				RoA.map(process =>
					pipe(
						this.deleteFoodsByIds(process.ids),
						TE.flatMap(() => this.removeProcess(process.id))
					)
				)
			),
			TE.flatMapTask(T.sequenceArray)
		)
	}

	private readonly addFailure: AddFailure
	private readonly removeProcess: RemoveProcess
	private readonly deleteFoodsByIds: DeleteFoodsByIds
	private readonly getProcesses: GetProcesses
}
