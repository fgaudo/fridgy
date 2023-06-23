import * as Log from '@/core/log'
import { Single } from '@/core/rxjs'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
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
	onceInfo: typeof Log.info
	onceError: typeof Log.error
	onceFlow: Single<string>
}>

type FoodOverviewReturn = FoodOverviewViewModel | Log.LogEntry

export type FoodOverview = (
	deps: FoodOverviewDeps
) => (cmds: Rx.Observable<FoodOverviewCmd>) => Rx.Observable<FoodOverviewReturn>

export const foodOverview: FoodOverview = ({
	onceNow,
	onFoods,
	onceInfo,
	onceError,
	onceFlow
}) =>
	flow(
		Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
		Rx.switchMap(cmd =>
			pipe(
				onceFlow,
				O.map(flow1 => [cmd, flow1] as const)
			)
		),
		Rx.switchMap(([cmd, flow1]) =>
			Rx.concat(
				onceInfo(`Received command ${JSON.stringify(cmd)}`, [flow1]),
				pipe(
					Rx.combineLatest([onFoods(cmd.sort), onceNow]),
					Rx.switchMap(([foods, firstNowEither], index) => {
						const indexString = index.toString(10)

						const firstLoad = pipe(
							firstNowEither,
							OE.fromEither,
							OE.fold(
								error =>
									Rx.concat(
										onceError(
											`Received ${foods.length} food elements but there was a problem retrieving the current timestamp. ${error}`,
											[flow1, indexString]
										),
										O.of(errorViewModel(error, cmd.sort))
									),
								now =>
									Rx.concat(
										onceInfo(
											`Received ${
												foods.length
											} food elements together with the current timestamp ${now.toString(
												10
											)}`,
											[flow1, indexString]
										),
										O.of(dataViewModel(foods, now, cmd.sort)),
										onceInfo('Emitted viewmodel', [flow1, indexString])
									)
							)
						)

						const nextLoads = Rx.concat(
							onceInfo(`Received ${foods.length} food elements`, [
								flow1,
								indexString
							]),
							pipe(
								onceNow,
								OE.fold(
									error =>
										Rx.concat(
											onceError(
												`There was a problem retrieving the current timestamp. ${error}`,
												[flow1, indexString]
											),
											O.of(errorViewModel(error, cmd.sort))
										),
									now =>
										Rx.concat(
											onceInfo(
												`Received the current timestamp ${now.toString(10)}`,
												[flow1, indexString]
											),
											O.of(dataViewModel(foods, now, cmd.sort)),
											onceInfo('Emitted viewmodel', [flow1, indexString])
										)
								)
							)
						)

						return index === 0 ? firstLoad : nextLoads
					}),
					Rx.startWith<FoodOverviewReturn>(loadingViewModel)
				)
			)
		),
		Rx.startWith<FoodOverviewReturn>(loadingViewModel),
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
