import { readerObservable as ROX } from '@fgaudo/fp-ts-rxjs-extension'
import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS
} from 'fp-ts'
import { observable as O, readerObservable as RO } from 'fp-ts-rxjs'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { Controller } from '@/core/controller'
import { filterMap } from '@/core/rx'

import { Food, foodEq } from '@/domain/food'

import { AddFailure } from '@/app/commands/failures'
import { OnFoods, toFoodEntity } from '@/app/commands/foods'
import { Log, LogType } from '@/app/commands/log'
import { AddProcess, OnProcesses, Processes } from '@/app/commands/processes'

interface Deps {
	readonly process$: OnProcesses
	readonly addProcess: AddProcess
	readonly food$: OnFoods
	readonly log: Log
	readonly addFailure: AddFailure
}

interface FoodModel {
	readonly id: string
	readonly name: string
	readonly deleting: boolean
}

export type OverviewModel = Readonly<
	| {
			type: 'ready'
			foods: readonly FoodModel[]
	  }
	| { type: 'loading' }
>

export type Command = Readonly<{ type: 'delete'; ids: ReadonlySet<string> }>

export type OverviewController = Controller<Command, OverviewModel>

const foodModelEq: Eq.Eq<FoodModel> = Eq.fromEquals((a, b) => a.id === b.id)

export const overview: R.Reader<Deps, OverviewController> = pipe(
	[
		pipe(
			R.asks((deps: Deps) => deps.food$),
			ROX.tap(
				foods => deps =>
					deps.log(LogType.info, `Received ${foods.size} food entries`)
			),
			RO.map(
				// We convert all food data into food entities in order to enforce business constraints.
				RoS.map(foodEq)(toFoodEntity)
			),
			R.chain(flip(deps => Rx.combineLatestWith(deps.process$))),
			RO.map(([foods, processes]) =>
				// We create the food model by merging the entity with the queued processes
				RoS.map(foodModelEq)((food: Food) => toFoodModel(food, processes))(
					foods
				)
			),
			RO.map(RoS.toReadonlyArray(Ord.trivial)),
			RO.map(foods => ({ foods, type: 'ready' }) as OverviewModel),
			R.map(Rx.startWith({ type: 'loading' } as OverviewModel))
		),
		flow(
			R.of<Deps, Rx.Observable<Command>>,
			R.chain(
				flip(deps => Rx.tap(deps.log(LogType.info, `Received delete command`)))
			),
			RO.map(del => ({ type: 'delete', ids: del.ids }) as const),
			R.chain(flip(deps => Rx.switchMap(flow(deps.addProcess, O.fromTask)))),
			R.chain(
				flip(deps => Rx.tap(deps.log(LogType.info, `Delete command executed`)))
			),
			R.map(filterMap(OPT.getLeft)),
			ROX.tap(
				error => deps =>
					deps.log(LogType.error, `Delete command failed: ${error.message}`)
			),
			R.chain(
				flip(deps =>
					Rx.mergeMap(flow(deps.addFailure, O.fromTask, Rx.ignoreElements()))
				)
			)
		)
	] as const,

	streams => deps =>
		new Controller(
			command$ => Rx.merge(streams[0](deps), streams[1](command$)(deps)),
			{ type: 'loading' } as const
		)
)

function toFoodModel(food: Food, processes: Processes): FoodModel {
	return { ...food, deleting: processes.delete.has(food.id) }
}
