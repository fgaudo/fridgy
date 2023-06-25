import * as Log from '@/core/logging'
import { Single } from '@/core/rxjs'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import { OnceNow } from '@/application/queries/now'
import { FoodEntry, OnFoods } from '@/application/streams/foods'

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

type FoodOverviewReturn = FoodOverviewViewModel | Log.LogEntry
export type FoodOverviewDeps = Readonly<{
	onceNow: OnceNow
	onFoods: OnFoods
	onceInfo: typeof Log.info
	onceError: typeof Log.error
	onceFlow: Single<string>
}>

export type FoodOverview = (
	command$: Rx.Observable<FoodOverviewCmd>
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

type StartCommandFlow = (
	f: (
		command: Readonly<{
			command: FoodOverviewCmd
			requestFlow: string
		}>
	) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>
) => (
	r: Rx.Observable<FoodOverviewCmd>
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

const startCommandFlow: StartCommandFlow = f =>
	flow(
		RO.fromObservable<FoodOverviewDeps, FoodOverviewCmd>,
		R.bindTo('cmd$'),
		R.bind('deps', () => R.ask<FoodOverviewDeps>()),
		R.map(({ cmd$, deps }) =>
			pipe(
				cmd$,
				Rx.switchMap(command =>
					Rx.concat(
						deps.onceInfo('ciao'),
						pipe(
							deps.onceFlow,
							Rx.switchMap(requestFlow =>
								Rx.concat(
									deps.onceInfo(`Created request flow ${requestFlow}`),
									f({ requestFlow, command })(deps)
								)
							)
						)
					)
				),
				Rx.startWith<FoodOverviewReturn>(loadingViewModel),
				Rx.distinctUntilChanged(
					(previous, current) =>
						previous._tag === 'Loading' && current._tag === 'Loading'
				)
			)
		)
	)

type OnFoodData = (
	sorting: Sorting,
	requestFlow: string,
	success: (
		entries: ReadonlyArray<FoodEntry>,
		now: number,
		s: Sorting
	) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>,
	error: (
		err: string,
		s: Sorting
	) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

const onFoodData: OnFoodData = (sorting, requestFlow, success, error) => deps =>
	Rx.concat(
		deps.onceInfo(`Starting listening to foods`, [requestFlow]),
		pipe(
			Rx.combineLatest([deps.onFoods(sorting), deps.onceNow]),
			Rx.switchMap(([foods, either], index) => {
				const indexString = index.toString(10)
				return index === 0
					? pipe(
							either,
							OE.fromEither,
							OE.fold(
								err =>
									Rx.concat(
										deps.onceError(
											`Received ${foods.length} food elements but there was a problem retrieving the current timestamp. ${error}`,
											[requestFlow, indexString]
										),
										error(err, sorting)(deps)
									),
								now => success(foods, now, sorting)(deps)
							)
					  )
					: Rx.concat(
							deps.onceInfo(`Received ${foods.length} food elements`, [
								requestFlow,
								indexString
							]),
							pipe(
								deps.onceNow,
								OE.fold(
									err =>
										Rx.concat(
											deps.onceError(
												`There was a problem retrieving the current timestamp. ${error}`,
												[requestFlow, indexString]
											),
											error(err, sorting)(deps)
										),
									now => success(foods, now, sorting)(deps)
								)
							)
					  )
			})
		)
	)

const errorViewModel: (
	error: string,
	sort: Sorting
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn> = (
	error,
	sort
) =>
	RO.of({
		_tag: 'Error',
		error,
		sort
	} as const)

const successViewModel: (
	data: ReadonlyArray<FoodEntry>,
	now: number,
	sort: Sorting
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn> = (
	data,
	now,
	sort
) =>
	RO.of({
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

export const foodOverview: FoodOverview = flow(
	startCommandFlow(({ command, requestFlow }) =>
		onFoodData(command.sort, requestFlow, successViewModel, errorViewModel)
	)
)
