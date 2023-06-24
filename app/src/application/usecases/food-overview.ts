import * as Log from '@/core/logging'
import { Single } from '@/core/rxjs'
import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RO from 'fp-ts-rxjs/lib/ReaderObservable'
import * as RoA from 'fp-ts/ReadonlyArray'
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
	commands: Rx.Observable<FoodOverviewCmd>
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

export const foodOverview: FoodOverview = flow(
	Rx.startWith<FoodOverviewCmd>({ sort: 'date', page: 1 } as const),
	R.of,
	RO.bindTo('command'),
	RO.bind('requestFlow', ({ command }) =>
		pipe(
			R.ask<FoodOverviewDeps>(),
			R.map(({ onceFlow }) =>
				pipe(
					O.of(command),
					Rx.switchMap(() => onceFlow)
				)
			)
		)
	),
	RO.bind('onFoods', () => RO.asks(deps => deps.onFoods)),
	RO.bind('onceError', () => RO.asks(deps => deps.onceError)),
	RO.bind('onceInfo', () => RO.asks(deps => deps.onceInfo)),
	RO.bind('onceNow', () => RO.asks(deps => deps.onceNow)),
	RO.chain(({ command, requestFlow, onFoods, onceError, onceInfo, onceNow }) =>
		pipe(
			O.of(command),
			Rx.switchMap(() =>
				Rx.concat(
					onceInfo(`Received command ${JSON.stringify(command)}`, [
						requestFlow
					]),
					pipe(
						Rx.combineLatest([onFoods(command.sort), onceNow]),
						Rx.switchMap(([foods, firstNowEither], index) => {
							const indexString = index.toString(10)

							return index === 0
								? pipe(
										firstNowEither,
										OE.fromEither,
										OE.fold(
											error =>
												Rx.concat(
													onceError(
														`Received ${foods.length} food elements but there was a problem retrieving the current timestamp. ${error}`,
														[requestFlow, indexString]
													),
													O.of(errorViewModel(error, command.sort))
												),
											now =>
												Rx.concat(
													onceInfo(
														`Received ${
															foods.length
														} food elements together with the current timestamp ${now.toString(
															10
														)}`,
														[requestFlow, indexString]
													),
													O.of(dataViewModel(foods, now, command.sort)),
													onceInfo('Emitted viewmodel', [
														requestFlow,
														indexString
													])
												)
										)
								  )
								: Rx.concat(
										onceInfo(`Received ${foods.length} food elements`, [
											requestFlow,
											indexString
										]),
										pipe(
											onceNow,
											OE.fold(
												error =>
													Rx.concat(
														onceError(
															`There was a problem retrieving the current timestamp. ${error}`,
															[requestFlow, indexString]
														),
														O.of(errorViewModel(error, command.sort))
													),
												now =>
													Rx.concat(
														onceInfo(
															`Received the current timestamp ${now.toString(
																10
															)}`,
															[requestFlow, indexString]
														),
														O.of(dataViewModel(foods, now, command.sort)),
														onceInfo('Emitted viewmodel', [
															requestFlow,
															indexString
														])
													)
											)
										)
								  )
						}),
						Rx.startWith<FoodOverviewReturn>(loadingViewModel)
					)
				)
			),
			Rx.startWith<FoodOverviewReturn>(loadingViewModel),
			Rx.distinctUntilChanged(
				(previous, current) =>
					previous._tag === 'Loading' && current._tag === 'Loading'
			),
			RO.fromObservable<FoodOverviewDeps, FoodOverviewReturn>
		)
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
	data: ReadonlyArray<FoodEntry>,
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
