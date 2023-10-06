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

import { Interface } from '@/application/interfaces'
import { FoodEntry, Sorting } from '@/application/interfaces/streams/foods'

import { log } from '../helpers/logging'

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

export type FoodOverviewDeps = Interface['onceNow'] &
	Interface['onFoods'] &
	Interface['log'] &
	Interface['flow']

//////////////

type ErrorViewModel = (
	error: string,
	sort: Sorting
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

const errorViewModel: ErrorViewModel = (error, sort) =>
	RO.of({
		_tag: 'Error',
		error,
		sort
	} as const)

//////////////

type SuccessViewModel = (
	data: readonly FoodEntry[],
	now: number,
	sort: Sorting
) => RO.ReaderObservable<FoodOverviewDeps, FoodOverviewReturn>

const successViewModel: SuccessViewModel = (data, now, sort) =>
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

//////////////

const loadingViewModel: RO.ReaderObservable<
	FoodOverviewDeps,
	FoodOverviewReturn
> = RO.of({
	_tag: 'Loading'
} as const)

//////////////

const subject: Rx.Subject<FoodOverviewCmd> = new Rx.Subject()

export type FoodOverview = RO.ReaderObservable<
	FoodOverviewDeps,
	FoodOverviewReturn
>

export const switchBind = <K extends string, A, B>(
	name: Exclude<K, keyof A>,
	f: (a: A) => Rx.Observable<B>
): ((
	fa: Rx.Observable<A>
) => Rx.Observable<{ [P in keyof A | K]: P extends keyof A ? A[P] : B }>) =>
	Rx.switchMap(a =>
		pipe(
			f(a),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return
			O.map(b => ({ ...a, [name]: b } as any))
		)
	)

export const switchFirst: <A, B>(
	f: (a: A) => Rx.Observable<B>
) => (ma: Rx.Observable<A>) => Rx.Observable<A> = f =>
	Rx.switchMap(a =>
		pipe(
			f(a),
			O.map(() => a)
		)
	)

/**
 * Represents the entire "Food Overview" usecase.
 * @param command$ - Stream of commands
 * @returns A function returning a stream of either log entries or view-models.
 */

export const foodOverview: FoodOverview = deps =>
	pipe(
		subject,
		O.bindTo('cmd'),
		switchBind('flow', () =>
			pipe(
				deps.flow,
				OE.fromTaskEither,
				OE.fold(
					() => O.of('error'),
					flow => O.of(flow)
				)
			)
		),
		switchFirst(data => log('Start food data use case', [data.flow])(deps)),
		switchBind('foodData', data =>
			pipe(
				sequenceS(O.Apply)({
					foods: deps.onFoods(data.cmd.sort),
					nowEither: OE.fromTaskEither(deps.onceNow)
				}),
				Rx.switchMap(({ foods, nowEither }, index) =>
					pipe(
						index === 0 ? O.of(nowEither) : OE.fromTaskEither(deps.onceNow),
						OE.map(now => ({ foods, now } as const))
					)
				)
			)
		),
		Rx.switchMap(({ foodData }) =>
			pipe(
				foodData,
				E.fold(
					err =>
						pipe(
							log(err.message)(deps),
							Rx.switchMap(() => errorViewModel(err.message, 'name')(deps))
						),
					data => successViewModel(data.foods, 3, 'date')(deps)
				)
			)
		)
	)

export const next: (cmd: FoodOverviewCmd) => void = cmd => subject.next(cmd)

//////////////

/** @internal for testing */
export const _private = {
	loadingViewModel,
	successViewModel,
	errorViewModel
} as const
