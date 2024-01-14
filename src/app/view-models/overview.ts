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

import { createFood, name } from '@/domain/food'

import { AddFailure } from '@/app/commands/add-failure'
import { EnqueueProcess } from '@/app/commands/enqueue-process'
import { Log } from '@/app/commands/log'
import { OnChangeProcesses } from '@/app/streams/on-change-processes'
import { OnFoods } from '@/app/streams/on-foods'
import { foodDataEq } from '@/app/types/food'
import { ProcessInputDTO } from '@/app/types/process'

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

function createFoodModelEq<ID>(): Eq.Eq<
	FoodModel<ID>
> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}

export type Ready<ID> = Readonly<{
	type: 'ready'
	foods: readonly FoodModel<ID>[]
}>

export type Loading = Readonly<{
	type: 'loading'
}>

export type Model<ID> = Readonly<
	Ready<ID> | Loading
>

type DeleteByIds<ID> = Readonly<{
	type: 'delete'
	ids: RoNeS.ReadonlyNonEmptySet<ID>
}>

export type Command<ID> = DeleteByIds<ID>

export function createViewModel<ID>(): ViewModel<
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
					R.chain(handleOnFoods),
				),
				pipe(cmd$, handleDeleteByIds),
			),

		init: {
			type: 'loading',
		},
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
		RO.map(
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
		),
		R.chain(
			flip(({ processes$ }: UseCases<ID>) =>
				Rx.combineLatestWith(processes$),
			),
		),
		RO.map(([foods, processes]) =>
			pipe(
				foods,
				RoS.map(createFoodModelEq<ID>())(
					food => ({
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
					}),
				),
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
	(message: string) =>
	<ID>({ log }: UseCases<ID>) =>
		log('info', message)
