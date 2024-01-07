import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { Controller } from '@/core/controller'
import {
	map,
	mergeMap,
	switchMap,
	tap,
} from '@/core/helpers'
import { filterMap } from '@/core/rx'

import { Food, foodEq } from '@/domain/food'

import {
	AddFailure,
	EnqueueProcess,
	Log,
} from '@/app/actions/commands'
import {
	OnChangeProcesses,
	OnFoods,
} from '@/app/actions/streams'
import { toFoodEntity } from '@/app/types/food'
import { info } from '@/app/types/log'
import { Processes } from '@/app/types/process'

interface UseCases<ENV> {
	readonly processes$: OnChangeProcesses<ENV>
	readonly enqueueProcess: EnqueueProcess<ENV>
	readonly foods$: OnFoods<ENV>
	readonly log: Log<ENV>
	readonly addFailure: AddFailure<ENV>
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

type Overview = <ENV>(
	useCases: UseCases<ENV>,
) => (
	cmd$: Rx.Observable<Command>,
) => R.Reader<ENV, Rx.Observable<OverviewModel>>

export const overview: Overview =
	<ENV>(useCases: UseCases<ENV>) =>
	(cmd$: Rx.Observable<Command>) =>
		pipe(
			[
				pipe(
					R.asks(useCases.foods$),
					tap(foods =>
						useCases.log(
							info(
								`Received ${foods.size} food entries`,
							),
						),
					),
					map(
						// We convert all food data into food entities in order to enforce business constraints.
						RoS.map(foodEq)(toFoodEntity),
					),
					R.chain(
						flip(deps =>
							Rx.combineLatestWith(
								useCases.processes$(deps),
							),
						),
					),
					map(([foods, processes]) =>
						// We create the food model by merging the entity with the queued processes
						RoS.map(foodModelEq)((food: Food) =>
							toFoodModel(food, processes),
						)(foods),
					),
					map(
						RoS.toReadonlyArray(
							Ord.fromCompare(() => 0),
						),
					),
					map(
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
					R.of<ENV, Rx.Observable<Command>>,
					tap(() =>
						useCases.log(
							info(`Received delete command`),
						),
					),
					map(
						del =>
							({
								type: 'delete',
								ids: del.ids,
							}) as const,
					),
					switchMap(
						process => deps =>
							Rx.defer(
								useCases.enqueueProcess(process)(
									deps,
								),
							),
					),
					tap(() =>
						useCases.log(
							info(`Delete command executed`),
						),
					),
					R.map(filterMap(OPT.getLeft)),
					tap(error =>
						useCases.log(
							info(
								`Delete command failed: ${error.message}`,
							),
						),
					),
					mergeMap(
						flow(
							useCases.addFailure,
							R.map(Rx.defer),
						),
					),
					R.map(Rx.ignoreElements()),
				),
			] as const,

			streams => (deps: ENV) =>
				Rx.merge(
					streams[0](deps),
					streams[1](cmd$)(deps),
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
