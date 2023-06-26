import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import * as Log from '@/application/queries/logging'
import { OnceNow } from '@/application/queries/now'
import { FoodEntry, OnFoods } from '@/application/streams/foods'

import { onceRequestFlow } from '../helpers/create-flow'
import { logError, logInfo } from '../helpers/create-logging'
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
			foods: readonly FoodModel[]
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
	onceInfo: OnceInfo
	onceError: OnceError
	onceFlow: OnceFlow
}>

type HandleNewCommand = (
	f: (command: FoodOverviewCmd, requestFlow: string) => ReturnType<FoodOverview>
) => (r: Rx.Observable<FoodOverviewCmd>) => ReturnType<FoodOverview>

/** Exported for testing
 *  @internal */
export const handleNewCommand: HandleNewCommand = f => command$ => deps =>
	pipe(
		command$,
		Rx.switchMap(command =>
			Rx.concat(
				logInfo<FoodOverviewViewModel>(
					`Received command ${JSON.stringify(command)}`
				)(deps),
				loadingViewModel(deps),
				onceRequestFlow(requestFlow => f(command, requestFlow))(deps)
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
		entries: readonly FoodEntry[],
		now: number,
		s: Sorting
	) => ReturnType<FoodOverview>
) => ReturnType<FoodOverview>

/** Exported for testing
 *  @internal */
export const onFoodData: OnFoodData = (command, requestFlow, success) => deps =>
	Rx.concat(
		logInfo<FoodOverviewViewModel>(`Starting listening to foods`, [
			requestFlow
		])(deps),
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
										logError<FoodOverviewViewModel>(
											`Received ${foods.length} food elements but there was a problem retrieving the current timestamp. ${exception.message}`,
											[requestFlow, indexString]
										)(deps),
										errorViewModel(exception.message, command.sort)(deps)
									),
								now => success(foods, now, command.sort)(deps)
							)
					  )
					: Rx.concat(
							logInfo<FoodOverviewViewModel>(
								`Received ${foods.length} food elements`,
								[requestFlow, indexString]
							)(deps),
							loadingViewModel(deps),
							pipe(
								deps.onceNow,
								OE.fold(
									exception =>
										Rx.concat(
											logError<FoodOverviewViewModel>(
												`There was a problem retrieving the current timestamp. ${exception.message}`,
												[requestFlow, indexString]
											)(deps),
											errorViewModel(exception.message, command.sort)(deps)
										),
									now => success(foods, now, command.sort)(deps)
								)
							)
					  )
			})
		)
	)

/** Exported for testing
 *  @internal */
export const errorViewModel: (
	error: string,
	sort: Sorting
) => ReturnType<FoodOverview> = (error, sort) =>
	ROE.of({
		_tag: 'Error',
		error,
		sort
	} as const)

/** Exported for testing
 *  @internal */
export const successViewModel: (
	data: readonly FoodEntry[],
	now: number,
	sort: Sorting
) => ReturnType<FoodOverview> = (data, now, sort) =>
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

/** Exported for testing
 *  @internal */
export const loadingViewModel: ReturnType<FoodOverview> = ROE.of({
	_tag: 'Loading'
} as const)

export type FoodOverview = (
	command$: Rx.Observable<FoodOverviewCmd>
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewViewModel
>

/**
 * Represents the entire "Food Overview" usecase.
 * @param command$ - Stream of commands
 * @returns A function returning a stream of either log entries or view-models.
 */
export const foodOverview: FoodOverview = flow(
	handleNewCommand((command, requestFlow) =>
		onceRequestFlow(re => onFoodData(command, requestFlow, successViewModel))
	)
)
