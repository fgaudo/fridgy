import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { fromEquals } from 'fp-ts/lib/Eq'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as Food from '@/domain/food'

import { Now$ } from '@/application/query/get-now'
import { GetFoods } from '@/application/stream/foods'

const Equ = RoA.getEq(fromEquals<FoodModel>((a, b) => a.id === b.id))

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
	| Readonly<{ _tag: 'Loading' }>

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

export const foodOverview: FoodOverview = ({ now$, getFoods }) =>
	flow(
		Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
		Rx.switchMap(cmd =>
			pipe(
				Rx.combineLatest([getFoods(cmd.sort), now$]), // optimization. Not sure if there’s a simpler way
				Rx.switchMap(([foods, firstNowEither], index) =>
					index === 0
						? pipe(
								firstNowEither,
								E.fold(
									error => errorViewModel(error, cmd.sort),
									now => dataViewModel(foods, now, cmd.sort)
								),
								O.of,
								Rx.startWith(loadingViewModel)
						  )
						: pipe(
								now$,
								OE.fold(
									error => O.of(errorViewModel(error, cmd.sort)),
									now => O.of(dataViewModel(foods, now, cmd.sort))
								),
								Rx.startWith(loadingViewModel)
						  )
				),
				Rx.startWith(loadingViewModel)
			)
		),
		Rx.distinctUntilChanged(
			(a, b) =>
				(a._tag === 'Loading' && b._tag === 'Loading') ||
				(a._tag === 'Ready' &&
					b._tag === 'Ready' &&
					a.total === b.total &&
					Equ.equals(a.foods, b.foods))
		)
	)

const errorViewModel: (
	error: string,
	sort: Sorting
) => FoodOverviewViewModel = (error, sort) =>
	({
		_tag: 'Error',
		error,
		sort
	} as const)

const dataViewModel: (
	data: readonly Food.FoodData[],
	now: number,
	sort: Sorting
) => FoodOverviewViewModel = (data, now, sort) => ({
	now,
	page: 1,
	total: 0,
	sort,
	_tag: 'Ready',
	foods: pipe(
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
})

const loadingViewModel: FoodOverviewViewModel = { _tag: 'Loading' } as const
