import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import { Reader } from 'fp-ts/lib/Reader'
import * as Rx from 'rxjs'

import { Controller } from '@/core/controller'
import {
	map,
	mergeMap,
	switchMap,
	tap,
} from '@/core/helpers'
import { filterMap } from '@/core/rx'

import { Food, areEqual } from '@/domain/food'

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

interface UseCases {
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

type Overview = Reader<
	UseCases,
	Controller<Command, OverviewModel>
>
export const overview: Overview = pipe(
	[
		pipe(
			R.asks(({ foods$ }: UseCases) => foods$),
			tap(
				foods =>
					({ log }) =>
						pipe(
							info(
								`Received ${foods.size} food entries`,
							),
							log,
						),
			),
			map(
				// We convert all food data into food entities in order to enforce business constraints.
				RoS.map(Eq.fromEquals(areEqual))(
					toFoodEntity,
				),
			),
			R.chain(
				flip(({ processes$ }) =>
					Rx.combineLatestWith(processes$),
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
			R.of<UseCases, Rx.Observable<Command>>,
			tap(
				() =>
					({ log }) =>
						pipe(
							info(`Received delete command`),
							log,
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
				flip(({ enqueueProcess }) =>
					flow(enqueueProcess, Rx.defer),
				),
			),
			tap(
				() =>
					({ log }) =>
						pipe(
							info(`Delete command executed`),
							log,
						),
			),
			R.map(filterMap(OPT.getLeft)),
			tap(
				error =>
					({ log }) =>
						pipe(
							info(
								`Delete command failed: ${error.message}`,
							),
							log,
						),
			),
			mergeMap(
				error =>
					({ addFailure }) =>
						pipe(addFailure(error), Rx.defer),
			),
			R.map(Rx.ignoreElements()),
		),
	] as const,

	([foods, deleteByIds]) =>
		useCases =>
			new Controller(
				cmd$ =>
					Rx.merge(
						foods(useCases),
						deleteByIds(cmd$)(useCases),
					),
				{
					type: 'loading',
				} satisfies OverviewModel,
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
