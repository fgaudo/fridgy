import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as Food from '@/domain/food'

import { Now$ } from '@/application/query/get-now'
import { GetFoods } from '@/application/stream/foods'

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

export type FoodOverviewDeps = { now$: Now$; getFoods: GetFoods }

type FoodOverview = (
	deps: FoodOverviewDeps
) => (
	cmds: Rx.Observable<FoodOverviewCmd>
) => Rx.Observable<FoodOverviewViewModel>

export const foodOverview: FoodOverview =
	({ now$, getFoods }) =>
	cmds$ =>
		pipe(
			cmds$,
			Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
			O.bindTo('cmd'),
			Rx.switchMap(bind => {
				const foods$ = getFoods(bind.cmd.sort)

				const periodicRefresh$ = pipe(
					foods$,
					Rx.switchMap(foods =>
						pipe(
							Rx.timer(10000),
							Rx.repeat(),
							O.map(() => foods)
						)
					)
				)

				const foodData$ = pipe(
					Rx.merge(foods$, periodicRefresh$),
					Rx.zipWith(pipe(now$, Rx.take(1))),
					O.map(([data, either]) =>
						pipe(
							either,
							E.fold(E.left, now => E.right([data, now] as const))
						)
					)
				)

				return pipe(
					foodData$,
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
			}),
			OE.bind('foodModels', ({ data, now }) =>
				OE.right(
					pipe(
						data,
						RoA.map(foodData => {
							const food = Food.deserialize(foodData)

							return {
								id: Food.id(food),
								name: Food.name(food),
								expDate: Food.expDate(food),
								state: Food.expirationStatus(now)(food)
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
