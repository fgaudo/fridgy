import { readerObservable as RO } from '@fgaudo/fp-ts-rxjs'
import {
	eq as Eq,
	ord as Ord,
	reader as R,
	readerIO as RIO,
	readonlySet as RoS,
	task as T,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { ViewModel } from '@/core/view-model'

import { Food, areEqual } from '@/domain/food'

import { AddFailure } from '@/app/commands/add-failure'
import { EnqueueProcess } from '@/app/commands/enqueue-process'
import { Log } from '@/app/commands/log'
import { GenerateUUID } from '@/app/queries/generate-uuid'
import { GetTimestamp } from '@/app/queries/get-timestamp'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { OnFoods } from '@/app/streams/on-foods'
import { info } from '@/app/types/log'
import { ProcessDTO } from '@/app/types/process'

interface UseCases {
	readonly processes$: OnChangeProcesses
	readonly enqueueProcess: EnqueueProcess
	readonly foods$: OnFoods
	readonly log: Log
	readonly addFailure: AddFailure
	readonly getTimestamp: GetTimestamp
	readonly generateUUID: GenerateUUID
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

export const viewModel: ViewModel<
	UseCases,
	Command,
	Model
> = {
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
		RoS.map(Eq.fromEquals(areEqual))(f => f),
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

const handleDeleteByIds = (
	cmd$: Rx.Observable<DeleteByIds>,
) =>
	pipe(
		cmd$,
		R.of,
		RO.tap(() =>
			logInfo(`Received delete command`),
		),
		RO.mergeMap(del =>
			pipe(
				RIO.Do,
				RIO.bind('timestamp', () =>
					R.asks(
						(deps: UseCases) => deps.getTimestamp,
					),
				),
				RIO.bind('uuid', () =>
					R.asks(
						(deps: UseCases) => deps.generateUUID,
					),
				),
				R.map(flow(T.fromIO, Rx.defer)),
				RO.map(
					({ timestamp, uuid }) =>
						({
							timestamp,
							id: uuid,
							type: 'delete',
							ids: del.ids,
						}) satisfies ProcessDTO,
				),
			),
		),
		RO.mergeMap(
			flip(({ enqueueProcess }) =>
				flow(enqueueProcess, Rx.defer),
			),
		),
		RO.tap(() =>
			logInfo(`Delete command enqueued`),
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
