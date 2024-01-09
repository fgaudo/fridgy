import {
	either as E,
	readonlySet as RoS,
} from 'fp-ts'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as OE from '@/core/observable-either'

import * as C from '@/app/actions/commands'
import * as Q from '@/app/actions/queries'
import * as S from '@/app/actions/streams'
import {
	OverviewController,
	overview,
} from '@/app/controllers/overview'
import { processesOrd } from '@/app/types/process'

export * from '@/app/actions/queries'
export * from '@/app/actions/commands'
export * from '@/app/actions/streams'

export type AppUseCases = Readonly<{
	deleteFoodsByIds: C.DeleteFoodsByIds
	enqueueProcess: C.EnqueueProcess
	getProcesses: Q.GetProcesses
	processes$: S.OnChangeProcesses
	addFailure: C.AddFailure
	removeProcess: C.RemoveProcess
	foods$: S.OnFoods
	uiLog: C.Log
	appLog: C.Log
}>

export class App {
	constructor(useCases: AppUseCases) {
		this.overview = overview({
			enqueueProcess: useCases.enqueueProcess,
			addFailure: useCases.addFailure,
			foods$: useCases.foods$,
			processes$: useCases.processes$,
			log: useCases.appLog,
		})

		this.log = useCases.uiLog

		this.scheduler = pipe(
			Rx.interval(5000),
			Rx.mergeWith(useCases.processes$),
			Rx.exhaustMap(() =>
				Rx.defer(useCases.getProcesses),
			),
			Rx.map(
				E.map(RoS.toReadonlyArray(processesOrd)),
			),
			OE.mergeMapW(processes =>
				pipe(Rx.from(processes), Rx.map(E.right)),
			),
			OE.mergeMapW(process =>
				pipe(
					useCases.deleteFoodsByIds(process.ids),
					Rx.defer,
					Rx.map(() => E.right(process)),
				),
			),
			OE.mergeMap(process =>
				pipe(
					useCases.removeProcess(process.id),
					Rx.defer,
				),
			),
		)
	}

	init(): void {
		if (this.isRunning) {
			return
		}

		this.isRunning = true

		this.scheduler.subscribe()
	}

	readonly overview: OverviewController
	readonly log: C.Log

	private isRunning = false

	private readonly scheduler: Rx.Observable<unknown>
}
