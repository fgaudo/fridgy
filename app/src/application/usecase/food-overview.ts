import { fromTaskEither } from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoA from 'fp-ts/ReadonlyArray'
import * as E from 'fp-ts/lib/Either'
import {
	Observable,
	catchError,
	map,
	of,
	retry,
	startWith,
	switchMap,
	zipWith
} from 'rxjs'

import { GetNow } from '@/application/query/get-now'
import { Foods } from '@/application/stream/foods'

export { FoodIdEq, FoodIdOrd } from '@/domain/food'

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
	({ getNow, foods }: { getNow: GetNow; foods: Foods }) =>
	(cmds: Observable<FoodOverviewCmd>): Observable<FoodOverviewViewModel> =>
		cmds.pipe(
			startWith<FoodOverviewCmd>({ sort: 'name', page: 0 } as const),
			switchMap(cmd =>
				foods(cmd.sort).pipe(
					zipWith(
						fromTaskEither(getNow).pipe(
							map(either => {
								if (E.isLeft(either)) {
									throw either.left
								}
								return either.right
							}),
							retry({ delay: 2000 })
						)
					),
					map(
						([, now]) =>
							({
								_tag: 'Ready',
								foods: RoA.empty,
								now,
								page: 1,
								total: 0,
								sort: cmd.sort
							} as const)
					),
					catchError(() =>
						of({
							_tag: 'Error',
							error: 'Unexpected error',
							sort: cmd.sort
						} as const)
					)
				)
			),
			startWith<FoodOverviewViewModel>({
				_tag: 'Loading',
				sort: 'name'
			} as const)
		)
