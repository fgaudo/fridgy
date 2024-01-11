import {
	observable as O,
	readerObservable as RO,
} from '@fgaudo/fp-ts-rxjs'
import {
	eq as Eq,
	option as OPT,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { R_Transformer } from '@/core/transformer'

import { Food, areEqual } from '@/domain/food'

import { AddFailure } from '@/app/commands/add-failure'
import { EnqueueProcess } from '@/app/commands/enqueue-process'
import { Log } from '@/app/commands/log'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { OnFoods } from '@/app/streams/on-foods'
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

type DeleteByIds = Readonly<{
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<string>
}>

export type Command = DeleteByIds

interface Overview {
	readonly transformer: R_Transformer<
		UseCases,
		Command,
		Model
	>
	readonly init: Model
}

export const component: Overview = {
	transformer: cmd$ =>
		RO.merge(
			pipe(
				R.asks((deps: UseCases) => deps.foods$),
				R.chain(handleOnFoods),
			),
			pipe(cmd$, handleDeleteByIds),
		),

	init: {
		type: 'loading',
	} satisfies Model,
}

const handleOnFoods = flow(
	R.of<UseCases, UseCases['foods$']>,
	RO.tap(foods =>
		logInfo(
			`Received ${foods.size} food entries`,
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

const handleDeleteByIds = flow(
	R.of<UseCases, Rx.Observable<DeleteByIds>>,
	RO.tap(() =>
		logInfo(`Received delete command`),
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
	RO.tap(() =>
		logInfo(`Delete command executed`),
	),
	R.map(O.filterMap(OPT.getLeft)),
	RO.tap(error =>
		logInfo(
			`Delete command failed: ${error.message}`,
		),
	),
	RO.mergeMap(
		error =>
			({ addFailure }) =>
				pipe(addFailure(error), Rx.defer),
	),
	R.map(Rx.ignoreElements()),
)

const logInfo =
	(s: string) =>
	({ log }: UseCases) =>
		log(info(s))

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
