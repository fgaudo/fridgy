import {
	readerObservableEither as ROEx,
	readerObservable as ROx
} from '@fgaudo/fp-ts-rxjs-extension'
import * as ROE from 'fp-ts-rxjs/ReaderObservableEither'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as RoA from 'fp-ts/ReadonlyArray'
import { sequenceS } from 'fp-ts/lib/Apply'
import * as E from 'fp-ts/lib/Either'
import * as R from 'fp-ts/lib/Reader'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as D from '@/domain/food'

import * as Log from '@/application/helpers/logging'
import { Interface } from '@/application/interfaces'
import {
	FoodEntry,
	OnFoods,
	Sorting
} from '@/application/interfaces/streams/foods'

import { OnceNow } from '../interfaces/queries/now'

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

export type FoodOverviewDeps = Interface['onceNow'] & Interface['onFoods']

//////////////

type OnFoodDataDeps = Interface['onceNow'] & Interface['onFoods']

type OnFoodData = (
	command: FoodOverviewCmd,
	requestFlow: string
) => ROE.ReaderObservableEither<
	OnFoodDataDeps,
	Log.LogEntry,
	{ foods: readonly FoodEntry[]; now: number }
>

const onFoodData: OnFoodData = (command, requestFlow) =>
	flow(
		ROx.concat(
			Log.logInfo('Starting listening to food entries'),
			pipe(
				sequenceS(RO.Apply)({
					foods: pipe(
						R.asks<OnFoodDataDeps, OnFoods>(deps => deps.onFoods),
						R.map(onFoods => onFoods(command.sort))
					),
					nowEither: R.asks<OnFoodDataDeps, OnceNow>(deps => deps.onceNow)
				}),
				ROx.switchMap(({ foods, nowEither }, index) =>
					pipe(
						index === 0
							? RO.of(nowEither)
							: R.asks<OnFoodDataDeps, OnceNow>(deps => deps.onceNow),
						ROE.map(now => ({ foods, now } as const))
					)
				),
				ROEx.fold(
					err => Log.logInfo(`There was a problem: ${err.message}`),
					data => ROE.right(data)
				)
			)
		)
	)

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
	ROE.fromObservable,
	ROEx.switchMap(cmd => onFoodData(cmd, '')),
	ROE.chain(result => successViewModel(result.foods, 3, 'date'))
)

//////////////

/** @internal for testing */
export const _private = {
	loadingViewModel,
	successViewModel,
	errorViewModel,
	onFoodData
} as const
