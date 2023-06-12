import { fromTaskEither } from 'fp-ts-rxjs/lib/ObservableEither'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
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

export { FoodIdEq, FoodIdOrd } from '@/domain/food'

export interface FoodModel {
	readonly id: string
	readonly name: string
	readonly expDate: Date
	readonly state: 'expired' | 'ok' | 'check'
}

export interface FoodData {
	readonly id: string
	readonly name: string
	readonly expDate: Date
}

type Sorting = 'date' | 'name'
export type FoodOverviewViewModel =
	| Readonly<{
			_tag: 'Ready'
			readonly sort: Sorting
			readonly page: number
			readonly total: number
			readonly foods: ReadonlyMap<FoodModel['id'], FoodModel>
			readonly now: number
	  }>
	| Readonly<{ _tag: 'Error'; error: string; sort: Sorting }>
	| Readonly<{ _tag: 'Loading'; sort: Sorting }>

export type FoodOverviewData = ReadonlyMap<FoodData['id'], FoodData>

export type FoodOverviewCmd = Readonly<{
	limit: number
	sort: 'name' | 'date'
	page: number
}>

type FoodOverviewDep = {
	getNow: TE.TaskEither<string, number>
	foods: (sort: 'name' | 'date') => Observable<FoodOverviewData>
}

export const foodOverview =
	({ getNow, foods }: FoodOverviewDep) =>
	(cmds: Observable<FoodOverviewCmd>): Observable<FoodOverviewViewModel> =>
		cmds.pipe(
			startWith<FoodOverviewCmd>({ limit: 10, sort: 'name', page: 0 } as const),
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
								foods: RoM.empty,
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
				sort: 'name' as const
			} as const)
		)
