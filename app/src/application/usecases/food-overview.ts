import { Exception } from '@/core/exception'
import * as ROx from '@/core/readerObservable'
import * as ROEx from '@/core/readerObservableEither'
import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as Opt from 'fp-ts/Option'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { fromEquals } from 'fp-ts/lib/Eq'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import * as Log from '@/application/helpers/logging'
import { OnceNow } from '@/application/queries/now'
import { FoodEntry, OnFoods } from '@/application/streams/foods'

import { onceRequestFlow } from '../helpers/create-flow'
import { OnceFlow } from '../queries/flow'

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

export type FoodOverviewReturn = Log.LogEntry | FoodOverviewViewModel

export type FoodOverviewDeps = Readonly<{
	onceNow: OnceNow
	onFoods: OnFoods
	onceFlow: OnceFlow
}>

type LogInfo = (...p: Parameters<Log.LogInfo>) => ReturnType<FoodOverview>

const logInfo: LogInfo = (message, flows) =>
	RO.local((deps: FoodOverviewDeps) => deps.onceNow)(
		pipe(
			Log.logInfo(message, flows),
			RO.chain(entry => ROE.left(entry))
		)
	)

//////////////

type OnFoodData = (
	command: FoodOverviewCmd,
	requestFlow: string,
	success: (
		entries: readonly FoodEntry[],
		now: number,
		s: Sorting
	) => ReturnType<FoodOverview>
) => ReturnType<FoodOverview>

const onFoodData: OnFoodData = (command, requestFlow) =>
	ROx.combineLatest2(logInfo('message'), logInfo('message'))

//////////////

type ErrorViewModel = (error: string, sort: Sorting) => ReturnType<FoodOverview>

const errorViewModel: ErrorViewModel = (error, sort) =>
	ROE.right({
		_tag: 'Error',
		error,
		sort
	} as const)

//////////////

type SuccessViewModel = (
	data: readonly FoodEntry[],
	now: number,
	sort: Sorting
) => ReturnType<FoodOverview>

const successViewModel: SuccessViewModel = (data, now, sort) =>
	ROE.right({
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

//////////////

type LoadingViewModel = ReturnType<FoodOverview>

const loadingViewModel: LoadingViewModel = ROE.right({
	_tag: 'Loading'
} as const)

//////////////

export type FoodOverview = (
	command$: Rx.Observable<FoodOverviewCmd>
) => ROE.ReaderObservableEither<
	FoodOverviewDeps,
	Log.LogEntry,
	FoodOverviewReturn
>

/**
 * Represents the entire "Food Overview" usecase.
 * @param command$ - Stream of commands
 * @returns A function returning a stream of either log entries or view-models.
 */
export const foodOverview: FoodOverview = flow(
	R.chainW(
		flow(
			R.of,
			ROx.switchMapW(c => RO.of({ _tag: 'Loading' } as const))
		)
	)
)

//////////////

/** @internal for testing */
export const _private = {
	loadingViewModel,
	successViewModel,
	errorViewModel,
	onFoodData
} as const
