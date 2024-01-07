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

import { AddFailureWithDeps } from '@/app/commands/add-failure'
import { EnqueueProcessWithDeps } from '@/app/commands/enqueue-process'
import { LogWithDeps } from '@/app/commands/log'
import { OnChangeProcessesWithDeps } from '@/app/streams/on-change-processes'
import { OnFoodsWithDeps } from '@/app/streams/on-foods'
import { toFoodEntity } from '@/app/types/food'
import { info } from '@/app/types/log'
import { Processes } from '@/app/types/process'

interface UseCases<DEPS> {
	readonly processes$: OnChangeProcessesWithDeps<DEPS>
	readonly enqueueProcess: EnqueueProcessWithDeps<DEPS>
	readonly foods$: OnFoodsWithDeps<DEPS>
	readonly log: LogWithDeps<DEPS>
	readonly addFailure: AddFailureWithDeps<DEPS>
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

type Overview = <DEPS>(
	useCases: UseCases<DEPS>,
) => (
	cmd$: Rx.Observable<Command>,
) => R.Reader<DEPS, Rx.Observable<OverviewModel>>

export const overview: Overview =
	useCases => cmd$ =>
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
					R.of<unknown, Rx.Observable<Command>>,
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
						flow(
							useCases.enqueueProcess,
							R.map(Rx.defer),
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

			streams => deps =>
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
