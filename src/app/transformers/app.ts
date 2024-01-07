import { none, some } from 'fp-ts/lib/Option'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { map, mergeMap } from '@/core/helpers'
import { filterMap } from '@/core/rx'

import {
	AddFailure,
	DeleteFoodsByIds,
	EnqueueProcess,
	Log,
	RemoveProcess,
} from '@/app/actions/commands'
import { GetProcesses } from '@/app/actions/queries'
import {
	OnChangeProcesses,
	OnFoods,
} from '@/app/actions/streams'
import * as Overview from '@/app/transformers/overview'
import * as L from '@/app/types/log'

export type Command =
	| {
			useCase: 'overview'
			command: Overview.Command
	  }
	| { useCase: 'log'; log: L.Log }

export interface Model {
	useCase: 'overview'
	model: Overview.OverviewModel
}

export type AppParams<ENV> = Readonly<{
	deleteFoodsByIds: DeleteFoodsByIds<ENV>
	enqueueProcess: EnqueueProcess<ENV>
	getProcesses: GetProcesses<ENV>
	processes$: OnChangeProcesses<ENV>
	addFailure: AddFailure<ENV>
	removeProcess: RemoveProcess<ENV>
	foods$: OnFoods<ENV>
	uiLog: Log<ENV>
	appLog: Log<ENV>
}>

export type App = <ENV>(
	params: AppParams<ENV>,
) => (
	command$: Rx.Observable<Command>,
) => R.Reader<ENV, Rx.Observable<Model>>

export const app: App = useCases => cmd$ =>
	pipe(
		[
			pipe(
				cmd$,
				filterMap(cmd =>
					cmd.useCase === 'overview'
						? some(cmd.command)
						: none,
				),
				Overview.overview({
					addFailure: useCases.addFailure,
					enqueueProcess: useCases.enqueueProcess,
					log: useCases.appLog,
					foods$: useCases.foods$,
					processes$: useCases.processes$,
				}),
				map(
					model =>
						({
							useCase: 'overview',
							model,
						}) satisfies Model,
				),
			),
			pipe(
				cmd$,
				filterMap(cmd =>
					cmd.useCase === 'log'
						? some(cmd.log)
						: none,
				),
				R.of,
				mergeMap(
					flow(
						useCases.uiLog,
						R.map(io =>
							Rx.defer(() => {
								io()
								return Rx.of()
							}),
						),
					),
				),
				R.map(Rx.ignoreElements()),
			),
		] as const,
		([overview, log]) =>
			deps =>
				Rx.merge(overview(deps), log(deps)),
	)
