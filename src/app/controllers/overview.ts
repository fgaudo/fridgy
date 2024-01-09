import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { Reader } from 'fp-ts/Reader'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { Controller } from '@/core/controller'
import * as RO from '@/core/reader-observable'
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
import {
	Process,
	Processes,
	processesEq,
} from '@/app/types/process'

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
			RO.tap(
				foods =>
					({ log }) =>
						pipe(
							info(
								`Received ${foods.size} food entries`,
							),
							log,
						),
			),
			RO.map(
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
			R.of<UseCases, Rx.Observable<Command>>,
			RO.tap(
				() =>
					({ log }) =>
						pipe(
							info(`Received delete command`),
							log,
						),
			),
			RO.map(
				del =>
					({
						type: 'delete',
						ids: del.ids,
					}) as const,
			),
			RO.mergeMap(
				flip(({ enqueueProcess }) =>
					flow(enqueueProcess, Rx.defer),
				),
			),
			RO.tap(
				() =>
					({ log }) =>
						pipe(
							info(`Delete command executed`),
							log,
						),
			),
			R.map(filterMap(OPT.getLeft)),
			RO.tap(
				error =>
					({ log }) =>
						pipe(
							info(
								`Delete command failed: ${error.message}`,
							),
							log,
						),
			),
			RO.mergeMap(
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
	processes: ReadonlySet<Process>,
): FoodModel {
	return {
		...food,
		deleting: pipe(
			processes,
			RoS.filter(
				process => process.type === 'delete',
			),
			RoS.some(
				process =>
					process.ids === food.id ||
					(!(typeof process.ids === 'string') &&
						process.ids.has(food.id)),
			),
		),
	}
}
