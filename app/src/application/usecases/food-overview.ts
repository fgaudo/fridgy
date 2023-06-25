import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as RoA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import * as Log from '@/application/queries/logging'
import { OnceNow } from '@/application/queries/now'
import { FoodEntry, OnFoods } from '@/application/streams/foods'

import { OnceFlow } from '../queries/flow'
import { OnceError, OnceInfo } from '../queries/logging'

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

export type FoodOverviewReturn = Log.WithLogging<FoodOverviewViewModel>

export type FoodOverviewDeps = Readonly<{
	onceNow: OnceNow
	onFoods: OnFoods
	onceInfo: OnceInfo<FoodOverviewViewModel>
	onceError: OnceError<FoodOverviewViewModel>
	onceFlow: OnceFlow
}>

type HandleNewCommand = (
	f: (
		command: FoodOverviewCmd,
		requestFlow: string
	) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>
) => (
	r: Rx.Observable<FoodOverviewCmd>
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
>

const handleNewCommand: HandleNewCommand = f => command$ => deps =>
	pipe(
		command$,
		Rx.switchMap(command =>
			Rx.concat(
				deps.onceInfo(`Received command ${JSON.stringify(command)}`),
				loadingViewModel(deps),
				pipe(
					deps.onceFlow,
					Rx.switchMap(either =>
						pipe(
							either,
							OE.fromEither,
							OE.fold(
								exception =>
									deps.onceInfo(
										`Could not create request flow: ${exception.message}`
									),
								requestFlow =>
									Rx.concat(
										deps.onceInfo(`Created request flow ${requestFlow}`),
										f(command, requestFlow)(deps)
									)
							)
						)
					)
				)
			)
		),
		OE.chain(viewModel =>
			pipe(
				O.of(viewModel),
				Rx.distinctUntilChanged(
					(previous, current) =>
						previous._tag === 'Loading' && current._tag === 'Loading'
				),
				OE.fromObservable<Log.LogEntry, FoodOverviewViewModel>
			)
		)
	)

type OnFoodData = (
	command: FoodOverviewCmd,
	requestFlow: string,
	success: (
		entries: ReadonlyArray<FoodEntry>,
		now: number,
		s: Sorting
	) => ROE.ReaderObservableEither<
		FoodOverviewDeps,
		Log.LogEntry,
		FoodOverviewViewModel
	>
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
>

const onFoodData: OnFoodData = (command, requestFlow, success) => deps =>
	Rx.concat(
		deps.onceInfo(`Starting listening to foods`, [requestFlow]),
		loadingViewModel(deps),
		pipe(
			Rx.combineLatest([deps.onFoods(command.sort), deps.onceNow]),
			Rx.switchMap(([foods, either], index) => {
				const indexString = index.toString(10)
				return index === 0
					? pipe(
							either,
							OE.fromEither,
							OE.fold(
								exception =>
									Rx.concat(
										deps.onceError(
											`Received ${foods.length} food elements but there was a problem retrieving the current timestamp. ${exception}`,
											[requestFlow, indexString]
										),
										errorViewModel(exception.message, command.sort)(deps)
									),
								now => success(foods, now, command.sort)(deps)
							)
					  )
					: Rx.concat(
							deps.onceInfo(`Received ${foods.length} food elements`, [
								requestFlow,
								indexString
							]),
							loadingViewModel(deps),
							pipe(
								deps.onceNow,
								OE.fold(
									exception =>
										Rx.concat(
											deps.onceError(
												`There was a problem retrieving the current timestamp. ${exception}`,
												[requestFlow, indexString]
											),
											errorViewModel(exception.message, command.sort)(deps)
										),
									now => success(foods, now, command.sort)(deps)
								)
							)
					  )
			})
		)
	)

const errorViewModel: (
	error: string,
	sort: Sorting
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
> = (error, sort) =>
	ROE.of({
		_tag: 'Error',
		error,
		sort
	} as const)

const successViewModel: (
	data: ReadonlyArray<FoodEntry>,
	now: number,
	sort: Sorting
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
> = (data, now, sort) =>
	ROE.of({
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

const loadingViewModel: RO.ReaderObservable<
	FoodOverviewDeps,
	FoodOverviewReturn
> = ROE.of({ _tag: 'Loading' } as const)

export type FoodOverview = (
	command$: Rx.Observable<FoodOverviewCmd>
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
>

export const foodOverview: FoodOverview = flow(
	handleNewCommand((command, requestFlow) =>
		onFoodData(command, requestFlow, successViewModel)
	)
)