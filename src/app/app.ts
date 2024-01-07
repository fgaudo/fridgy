import { none, some } from 'fp-ts/lib/Option'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { map, mergeMap } from '@/core/helpers'
import { filterMap } from '@/core/rx'

import { AddFailureWithDeps } from '@/app/commands/add-failure'
import { DeleteFoodsByIdsWithDeps } from '@/app/commands/delete-foods-by-ids'
import { EnqueueProcessWithDeps } from '@/app/commands/enqueue-process'
import { LogWithDeps } from '@/app/commands/log'
import { RemoveProcessWithDeps } from '@/app/commands/remove-process'
import * as Overview from '@/app/controllers/overview'
import { GetProcessesWithDeps } from '@/app/queries/get-processes'
import { OnChangeProcessesWithDeps } from '@/app/streams/on-change-processes'
import { OnFoodsWithDeps } from '@/app/streams/on-foods'
import * as L from '@/app/types/log'

type Command =
	| {
			useCase: 'overview'
			command: Overview.Command
	  }
	| { useCase: 'log'; log: L.Log }

interface Model {
	useCase: 'overview'
	model: Overview.OverviewModel
}

type AppParams<APP> = Readonly<{
	deleteFoodsByIds: DeleteFoodsByIdsWithDeps<APP>
	enqueueProcess: EnqueueProcessWithDeps<APP>
	getProcesses: GetProcessesWithDeps<APP>
	processes$: OnChangeProcessesWithDeps<APP>
	addFailure: AddFailureWithDeps<APP>
	removeProcess: RemoveProcessWithDeps<APP>
	foods$: OnFoodsWithDeps<APP>
	uiLog: LogWithDeps<APP>
	appLog: LogWithDeps<APP>
}>

type App = <APP>(
	params: AppParams<APP>,
) => (
	command$: Rx.Observable<Command>,
) => R.Reader<APP, Rx.Observable<Model>>

export const app: App =
	<APP>(useCases: AppParams<APP>) =>
	cmd$ =>
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
						log: useCases.appLog,
						enqueueProcess:
							useCases.enqueueProcess,
						processes$: useCases.processes$,
						addFailure: useCases.addFailure,
						foods$: useCases.foods$,
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
							useCases.appLog,
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
				(deps: APP) =>
					Rx.merge(overview(deps), log(deps)),
		)
