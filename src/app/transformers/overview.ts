import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import { R_Transformer } from '@/core/controller'
import * as RO from '@/core/reader-observable'
import * as RoNeS from '@/core/readonly-non-empty-set'
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
import { ProcessDTO } from '@/app/types/process'

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

export type Model = Readonly<
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
	ids: RoNeS.ReadonlyNonEmptySet<string>
}>

const onFoods = pipe(
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
		RoS.toReadonlyArray(Ord.fromCompare(() => 0)),
	),
	RO.map(
		foods =>
			({
				foods,
				type: 'ready',
			}) satisfies Model,
	),
	R.map(
		Rx.startWith({
			type: 'loading',
		} satisfies Model),
	),
)

const deleteByIds = flow(
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
)

type Overview = R_Transformer<
	UseCases,
	Command,
	Model
>

export const overview: Overview = {
	transformer: cmd$ => deps =>
		Rx.merge(
			onFoods(deps),
			deleteByIds(cmd$)(deps),
		),

	init: {
		type: 'loading',
	} satisfies Model,
}

function toFoodModel(
	food: Food,
	processes: ReadonlySet<ProcessDTO>,
): FoodModel {
	return {
		...food,
		deleting: pipe(
			processes,
			RoS.filter(
				process => process.type === 'delete',
			),
			RoS.some(process =>
				pipe(
					process.ids,
					RoNeS.toReadonlySet,
				).has(food.id),
			),
		),
	}
}
