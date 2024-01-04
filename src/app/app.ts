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
import { AddFailure } from '@/app/commands/failures'
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

type AppParameters = Readonly<{
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
	}: AppParameters) {
		this.overview = overview({
			enqueueProcess,
			addFailure,
			foods$,
			processes$,
			log: appLog
		})

		this.processes$ = processes$
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
			Rx.interval(5000),
			Rx.mergeWith(this.processes$),
			Rx.exhaustMap(() => O.fromTask(this.runProcesses()))
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

	private readonly removeProcess: RemoveProcess
	private readonly deleteFoodsByIds: DeleteFoodsByIds
	private readonly getProcesses: GetProcesses
	private readonly processes$: OnChangeProcesses
}
