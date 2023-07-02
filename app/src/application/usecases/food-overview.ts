import { Exception } from '@/core/exception'
import * as OEx from '@/core/observableEither'
import * as ROx from '@/core/readerObservable'
import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as RoA from 'fp-ts/ReadonlyArray'
import { sequenceT } from 'fp-ts/lib/Apply'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import * as Log from '@/application/helpers/logging'
import { Interface } from '@/application/interfaces'
import { Sorting } from '@/application/interfaces/streams/foods'

export type FoodModel = Readonly<{
	id: string
	name: string
	expDate: number
	state: 'expired' | 'ok' | 'check'
}>

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

export type FoodOverviewReturn = FoodOverviewViewModel

export type FoodOverviewDeps = Interface['onceNow']

//////////////

type OnFoodDataDeps = Interface['onceNow'] & Interface['onFoods']

type OnFoodData = (
	command: FoodOverviewCmd,
	requestFlow: string
) => ROE.ReaderObservableEither<
	OnFoodDataDeps,
	Log.LogEntry,
	readonly [readonly FoodEntry[], number]
>

const onFoodData: OnFoodData =
	(command, requestFlow) =>
	({ onceNow, onFoods }) => {
		const onFoodsOE = pipe(
			onFoods(command.sort),
			OE.rightObservable<Exception, readonly FoodEntry[]>
		)

		return Rx.concat(
			Log.logInfo('Starting listening to food entries')({ onceNow }),
			pipe(
				sequenceT(OEx.Apply)(onFoodsOE, onceNow),
				OEx.switchMap(([foods, now], index) =>
					index === 0
						? OE.right([foods, now] as const)
						: pipe(
								onceNow,
								OE.map(now => [foods, now] as const)
						  )
				),
				OE.fold(
					err =>
						Log.logInfo(`There was a problem: ${err.message}`)({ onceNow }),
					data => OE.right(data)
				)
			)
		)
	}

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
