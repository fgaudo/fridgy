import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import {
	FoodData,
	deserialize,
	expDate,
	expirationStatus,
	id,
	name
} from '@/domain/food'

import { GetNow } from '@/application/query/get-now'
import { Foods } from '@/application/stream/foods'

export interface FoodModel {
	readonly id: string
	readonly name: string
	readonly expDate: number
	readonly state: 'expired' | 'ok' | 'check'
}

export type Sorting = 'date' | 'name'

export type FoodOverviewViewModel =
	| Readonly<{
			_tag: 'Ready'
			sort: Sorting
			page: number
			total: number
			foods: ReadonlyArray<FoodModel>
			now: number
	  }>
	| Readonly<{ _tag: 'Error'; error: string; sort: Sorting }>
	| Readonly<{ _tag: 'Loading'; sort: Sorting }>

export type FoodOverviewCmd = Readonly<{
	sort: Sorting
	page: number
}>

export type FoodOverviewDeps = { getNow: GetNow; foods: Foods }

type FoodOverview = (
	deps: FoodOverviewDeps
) => (
	cmds: Rx.Observable<FoodOverviewCmd>
) => Rx.Observable<FoodOverviewViewModel>

export const foodOverview: FoodOverview =
	({ getNow, foods }) =>
	cmds => {
		const cmdsWithInit = pipe(
			cmds,
			Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const)
		)

		const periodicRefresh = pipe(
			Rx.timer(10000),
			Rx.takeUntil(cmdsWithInit),
			Rx.repeat(),
			O.chain(() => pipe(cmdsWithInit, Rx.last()))
		)

		return pipe(
			Rx.merge(cmdsWithInit, periodicRefresh),
			O.bindTo('cmd'),
			Rx.switchMap(bind =>
				pipe(
					getFoodDataParallel(foods(bind.cmd.sort), getNow),
					OE.bimap(
						error =>
							({
								_tag: 'Error',
								error,
								sort: bind.cmd.sort
							} as const),
						([data, now]) => ({ ...bind, data, now })
					)
				)
			),
			OE.bind('foodModels', ({ data, now }) =>
				OE.right(
					pipe(
						data,
						RoA.map(foodData => {
							const food = deserialize(foodData)
							return {
								id: id(food),
								name: name(food),
								expDate: expDate(food),
								state: expirationStatus(now)(food)
							}
						})
					)
				)
			),
			OE.fold(
				O.of,
				({ foodModels, now, cmd }): Rx.Observable<FoodOverviewViewModel> =>
					O.of({
						_tag: 'Ready',
						foods: foodModels,
						now,
						page: 1,
						total: 0,
						sort: cmd.sort
					} as const)
			),
			Rx.startWith<FoodOverviewViewModel>({
				_tag: 'Loading',
				sort: 'name'
			} as const)
		)
	}
const getFoodDataParallel = (
	foods: ReturnType<Foods>,
	now: GetNow
): OE.ObservableEither<string, readonly [readonly FoodData[], number]> =>
	pipe(
		Rx.zip(
			foods,
			pipe(
				now,
				OE.fromTaskEither,
				OE.getOrElse<string, number>(e => Rx.throwError(() => e))
			)
		),
		O.map(([data, now]) => E.right([data, now] as const)),
		Rx.catchError((error: string) => OE.left(error))
	)
