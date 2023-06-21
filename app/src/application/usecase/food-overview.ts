import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { OnceNow } from '@/application/query/get-now'
import { OnFoods } from '@/application/stream/foods'

import { FoodEntity } from '../types/food'

export type FoodModel = Readonly<{
	id: string
	name: string
	expDate: number
	state: 'expired' | 'ok' | 'check'
}>

export type Sorting = 'date' | 'name'

export type FoodOverviewViewModel = Readonly<
	| {
			_tag: 'Ready'
			sort: Sorting
			page: number
			total: number
			foods: ReadonlyArray<FoodModel>
			now: number
	  }
	| { _tag: 'Error'; error: string; sort: Sorting }
	| { _tag: 'Loading' }
>

export type FoodOverviewCmd = Readonly<{
	sort: Sorting
	page: number
}>

export type FoodOverviewDeps = Readonly<{
	onceNow: OnceNow
	onFoods: OnFoods
}>

type FoodOverview = (
	deps: FoodOverviewDeps
) => (
	cmds: Rx.Observable<FoodOverviewCmd>
) => Rx.Observable<FoodOverviewViewModel>

export const foodOverview: FoodOverview = ({ onceNow, onFoods }) =>
	flow(
		Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
		Rx.switchMap(cmd =>
			pipe(
				Rx.combineLatest([onFoods(cmd.sort), onceNow]), // optimization. Not sure if there’s a simpler way
				Rx.switchMap(([foods, firstNowEither], index) =>
					index === 0
						? pipe(
								firstNowEither,
								E.fold(
									error => errorViewModel(error, cmd.sort),
									now => dataViewModel(foods, now, cmd.sort)
								),
								O.of
						  )
						: pipe(
								onceNow,
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
			(previous, current) =>
				previous._tag === 'Loading' && current._tag === 'Loading'
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
	data: ReadonlyArray<FoodEntity>,
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
		RoA.map(({ id, ...foodData }) => {
			const food = D.fromExisting(foodData)
			return {
				id,
				name: D.name(food),
				expDate: D.expDate(food),
				state: D.expirationStatus(now)(food)
			}
		})
	)
})

const loadingViewModel: FoodOverviewViewModel = { _tag: 'Loading' } as const
