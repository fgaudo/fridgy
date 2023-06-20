import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { fromEquals } from 'fp-ts/lib/Eq'
import { flow, pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import * as Food from '@/domain/food'

import { Now$ } from '@/application/query/get-now'
import { GetFoods } from '@/application/stream/foods'

const Equ = RoA.getEq(fromEquals<FoodModel>((a, b) => a.id === b.id))

export interface FoodModel {
	readonly id: string
	readonly name: string
	readonly expDate: number
	readonly state: 'expired' | 'ok' | 'check'
}

export type Sorting = 'date' | 'name'

export type FoodOverviewViewModel =
	| Readonly<{
			_tag: 'Ready'
			sort: Sorting
			page: number
			total: number
			foods: ReadonlyArray<FoodModel>
			now: number
	  }>
	| Readonly<{ _tag: 'Error'; error: string; sort: Sorting }>
	| Readonly<{ _tag: 'Loading' }>

export type FoodOverviewCmd = Readonly<{
	sort: Sorting
	page: number
}>

export type FoodOverviewDeps = { now$: Now$; getFoods: GetFoods }

type FoodOverview = (
	deps: FoodOverviewDeps
) => (
	cmds: Rx.Observable<FoodOverviewCmd>
) => Rx.Observable<FoodOverviewViewModel>

export const foodOverview: FoodOverview = ({ now$, getFoods }) =>
	flow(
		Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
		Rx.switchMap(cmd =>
			pipe(
				getFoods(cmd.sort),
				Rx.switchMap(foods =>
					pipe(
						now$,
						O.map(either =>
							pipe(
								either,
								E.bimap(
									error =>
										({
											_tag: 'Error',
											error,
											sort: cmd.sort
										} as const),
									now => [foods, now] as const
								)
							)
						),
						OE.fold(
							O.of,
							([data, now]): Rx.Observable<FoodOverviewViewModel> =>
								pipe(
									data,
									RoA.map(foodData => {
										const food = Food.deserialize(foodData)

										return {
											id: Food.id(food),
											name: Food.name(food),
											expDate: Food.expDate(food),
											state: Food.expirationStatus(now)(food)
										}
									}),
									O.of,
									O.map(
										models =>
											({
												_tag: 'Ready',
												foods: models,
												now,
												page: 1,
												total: 0,
												sort: cmd.sort
											} as const)
									)
								)
						),
						Rx.startWith<FoodOverviewViewModel>({ _tag: 'Loading' } as const)
					)
				),
				Rx.startWith<FoodOverviewViewModel>({ _tag: 'Loading' } as const)
			)
		),
		Rx.distinctUntilChanged(
			(a, b) =>
				(a._tag === 'Loading' && b._tag === 'Loading') ||
				(a._tag === 'Ready' &&
					b._tag === 'Ready' &&
					a.total === b.total &&
					Equ.equals(a.foods, b.foods))
		)
	)
/*
foodOverview({
	getFoods: () =>
		Rx.interval(2000)
			.pipe(
				Rx.tap(a => console.log(JSON.stringify(a))),
				Rx.map(() => [])
			)
			.pipe(
				Rx.finalize(() => {
					console.log('FINITO')
				})
			),
	now$: OE.right(4)
})(new Rx.Subject()).subscribe()

setInterval(() => {
	console.log('ciao')
}, 3000)*/
