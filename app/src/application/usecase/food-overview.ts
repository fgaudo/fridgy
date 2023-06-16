import * as O from 'fp-ts-rxjs/lib/Observable'
import * as OE from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { FoodData } from '@/domain/food'

import { GetNow } from '@/application/query/get-now'
import { Foods } from '@/application/stream/foods'

export interface FoodModel {
	readonly id: string
	readonly name: string
	readonly expDate: Date
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
	| Readonly<{ _tag: 'Loading'; sort: Sorting }>

export type FoodOverviewCmd = Readonly<{
	sort: Sorting
	page: number
}>

export type FoodOverviewDep = { getNow: GetNow; foods: Foods }
export const foodOverview =
	({ getNow, foods }: FoodOverviewDep) =>
	(
		cmds: Rx.Observable<FoodOverviewCmd>
	): Rx.Observable<FoodOverviewViewModel> =>
		pipe(
			cmds,
			Rx.startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
			O.bindTo('cmd'),
			Rx.switchMap(bind =>
				pipe(
					Rx.zip(
						foods(bind.cmd.sort),
						pipe(
							getNow,
							OE.fromTaskEither,
							OE.getOrElse<string, number>(e => Rx.throwError(() => e))
						)
					),
					O.map(([data, now]) => E.right({ ...bind, data, now })),
					Rx.catchError((error: string) => OE.left({ ...bind, error }))
				)
			),
			OE.bind('foodModels', ({ data }) =>
				OE.of(pipe(data, RoA.map(foodToModel)))
			),
			OE.fold(
				({ cmd, error }): Rx.Observable<FoodOverviewViewModel> =>
					O.of({
						_tag: 'Error',
						error: error,
						sort: cmd.sort
					} as const),
				({ foodModels, now, cmd }): Rx.Observable<FoodOverviewViewModel> =>
					O.of({
						_tag: 'Ready',
						foods: foodModels,
						now,
						page: 1,
						total: 0,
						sort: cmd.sort
					} as const)
			),
			Rx.startWith<FoodOverviewViewModel>({
				_tag: 'Loading',
				sort: 'name'
			} as const)
		)

declare function foodToModel(f: FoodData): FoodModel
