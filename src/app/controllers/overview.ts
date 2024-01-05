import { readerObservable as ROX } from '@fgaudo/fp-ts-rxjs-extension'
import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import {
	observable as O,
	readerObservable as RO,
} from 'fp-ts-rxjs'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { Controller } from '@/core/controller'
import { filterMap } from '@/core/rx'

import { Food, foodEq } from '@/domain/food'

import { AddFailure } from '@/app/commands/add-failure'
import { EnqueueProcess } from '@/app/commands/enqueue-process'
import { Log } from '@/app/commands/log'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { OnFoods } from '@/app/streams/on-foods'
import { toFoodEntity } from '@/app/types/food'
import { info } from '@/app/types/log'
import { Processes } from '@/app/types/process'

interface Deps {
	readonly processes$: OnChangeProcesses
	readonly enqueueProcess: EnqueueProcess
	readonly foods$: OnFoods
	readonly log: Log
	readonly addFailure: AddFailure
}

interface FoodModel {
	readonly id: string
	readonly name: string
	readonly deleting: boolean
}

const foodModelEq: Eq.Eq<FoodModel> =
	Eq.fromEquals((a, b) => a.id === b.id)

export type OverviewModel = Readonly<
	| {
			type: 'ready'
			foods: readonly FoodModel[]
	  }
	| {
			type: 'loading'
	  }
>

export type Command = Readonly<{
	type: 'delete'
	ids: ReadonlySet<string>
}>

export type OverviewController = Controller<
	Command,
	OverviewModel
>

export const overview: R.Reader<
	Deps,
	OverviewController
> = pipe(
	[
		pipe(
			R.asks((deps: Deps) => deps.foods$),
			ROX.tap(
				foods => deps =>
					deps.log(
						info(
							`Received ${foods.size} food entries`,
						),
					),
			),
			RO.map(
				// We convert all food data into food entities in order to enforce business constraints.
				RoS.map(foodEq)(toFoodEntity),
			),
			R.chain(
				flip(deps =>
					Rx.combineLatestWith(deps.processes$),
				),
			),
			RO.map(([foods, processes]) =>
				// We create the food model by merging the entity with the queued processes
				RoS.map(foodModelEq)((food: Food) =>
					toFoodModel(food, processes),
				)(foods),
			),
			RO.map(
				RoS.toReadonlyArray(
					Ord.fromCompare(() => 0),
				),
			),
			RO.map(
				foods =>
					({
						foods,
						type: 'ready',
					}) satisfies OverviewModel,
			),
			R.map(
				Rx.startWith({
					type: 'loading',
				} satisfies OverviewModel),
			),
		),
		flow(
			R.of<Deps, Rx.Observable<Command>>,
			ROX.tap(
				() => deps =>
					deps.log(
						info(`Received delete command`),
					),
			),
			RO.map(
				del =>
					({
						type: 'delete',
						ids: del.ids,
					}) as const,
			),
			ROX.switchMap(process =>
				pipe(
					R.asks((deps: Deps) =>
						deps.enqueueProcess(process),
					),
					RO.fromReaderTask,
				),
			),
			ROX.tap(
				() => deps =>
					deps.log(
						info(`Delete command executed`),
					),
			),
			R.map(filterMap(OPT.getLeft)),
			ROX.tap(
				error => deps =>
					deps.log(
						info(
							`Delete command failed: ${error.message}`,
						),
					),
			),
			ROX.mergeMap(failure =>
				pipe(
					R.asks((deps: Deps) =>
						deps.addFailure(failure),
					),
					RO.fromReaderTask,
					R.map(Rx.ignoreElements()),
				),
			),
		),
	] as const,

	streams => deps =>
		new Controller(
			command$ =>
				Rx.merge(
					streams[0](deps),
					streams[1](command$)(deps),
				),
			{
				type: 'loading',
			} as const,
		),
)

function toFoodModel(
	food: Food,
	processes: Processes,
): FoodModel {
	return {
		...food,
		deleting: processes.delete.has(food.id),
	}
}
