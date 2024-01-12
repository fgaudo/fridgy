import { readerObservable as RO } from '@fgaudo/fp-ts-rxjs'
import {
	eq as Eq,
	ord as Ord,
	reader as R,
	readonlySet as RoS,
} from 'fp-ts'
import { flip, flow, pipe } from 'fp-ts/function'
import * as OPT from 'fp-ts/lib/Option'
import * as Rx from 'rxjs'

import * as RoNeS from '@/core/readonly-non-empty-set'
import { ViewModel } from '@/core/view-model'

import {
	Food,
	createFood,
	name,
} from '@/domain/food'

import { AddFailure } from '@/app/commands/add-failure'
import { EnqueueProcess } from '@/app/commands/enqueue-process'
import { Log } from '@/app/commands/log'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { OnFoods } from '@/app/streams/on-foods'
import { foodDataEq } from '@/app/types/food'
import { info } from '@/app/types/log'
import {
	ProcessDTO,
	ProcessInputDTO,
} from '@/app/types/process'

interface UseCases<ID> {
	readonly processes$: OnChangeProcesses<ID>
	readonly enqueueProcess: EnqueueProcess<ID>
	readonly foods$: OnFoods<ID>
	readonly log: Log
	readonly addFailure: AddFailure
}

interface FoodModel<ID> {
	readonly id: ID
	readonly name: string
	readonly deleting: boolean
}

function foodModelEq<ID>(): Eq.Eq<FoodModel<ID>> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}

export type Model<ID> = Readonly<
	| {
			type: 'ready'
			foods: readonly FoodModel<ID>[]
	  }
	| {
			type: 'loading'
	  }
>

type DeleteByIds<ID> = Readonly<{
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<ID>
}>

export type Command<ID> = DeleteByIds<ID>

export function viewModel<ID>(): ViewModel<
	UseCases<ID>,
	Command<ID>,
	Model<ID>
> {
	return {
		transformer: cmd$ =>
			RO.merge(
				pipe(
					R.asks(
						(deps: UseCases<ID>) => deps.foods$,
					),
					R.chain(handleOnFoods<ID>),
				),
				pipe(cmd$, handleDeleteByIds<ID>),
			),

		init: {
			type: 'loading',
		} satisfies Model<ID>,
	}
}

function handleOnFoods<ID>(
	obs: OnFoods<ID>,
): RO.ReaderObservable<UseCases<ID>, Model<ID>> {
	return pipe(
		obs,
		R.of<UseCases<ID>, OnFoods<ID>>,
		RO.tap(foods =>
			logInfo(
				`Received ${foods.size} food entries`,
			),
		),
		R.chain(
			flip(({ processes$ }: UseCases<ID>) =>
				Rx.combineLatestWith(processes$),
			),
		),
		RO.map(([foods, processes]) =>
			pipe(
				foods,
				RoS.filterMap(foodDataEq<ID>())(foodDTO =>
					pipe(
						foodDTO,
						createFood,
						OPT.map(food => ({
							id: foodDTO.id,
							name: name(food),
						})),
					),
				),
				RoS.map(foodModelEq<ID>())(food => ({
					...food,
					deleting: pipe(
						processes,
						RoS.filter(
							process =>
								process.type === 'delete',
						),
						RoS.some(process =>
							pipe(
								process.ids,
								RoNeS.toReadonlySet,
								RoS.some(id => food.id === id),
							),
						),
					),
				})),
			),
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
				}) satisfies Model<ID>,
		),
		R.map(
			Rx.startWith({
				type: 'loading',
			} satisfies Model<ID>),
		),
	)
}

function handleDeleteByIds<ID>(
	cmd$: Rx.Observable<DeleteByIds<ID>>,
): RO.ReaderObservable<UseCases<ID>, never> {
	return pipe(
		cmd$,
		R.of<
			UseCases<ID>,
			Rx.Observable<DeleteByIds<ID>>
		>,
		RO.tap(() =>
			logInfo(`Received delete command`),
		),
		RO.map(
			del =>
				({
					type: 'delete',
					ids: del.ids,
				}) satisfies ProcessInputDTO<ID>,
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
}

const logInfo =
	<ID>(s: string) =>
	({ log }: UseCases<ID>) =>
		log(info(s))
