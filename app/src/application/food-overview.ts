import * as RoM from 'fp-ts/ReadonlyMap'
import * as E from 'fp-ts/lib/Either'
import { Functor, Functor1 } from 'fp-ts/lib/Functor'
import { HKT, Kind, URIS } from 'fp-ts/lib/HKT'
import * as O from 'fp-ts/lib/Option'
import {
	GetNow,
	GetNow1,
	SwitchMap,
	SwitchMap1,
	Take,
	Take1
} from 'src/core/types'

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
export interface FoodOverviewViewModel {
	readonly foods: ReadonlyMap<FoodModel['id'], FoodModel>
	readonly error: O.Option<string>
}

type FoodOverviewData = ReadonlyMap<FoodData['id'], FoodData>

export interface GetFoodOverview1<M extends URIS> {
	foods: Kind<M, FoodOverviewData>
}

export interface GetFoodOverview<M> {
	foods: HKT<M, FoodOverviewData>
}

export type FoodOverviewType1<M extends URIS> = Functor1<M> &
	GetNow1<M> &
	GetFoodOverview1<M> &
	Take1<M> &
	SwitchMap1<M>

export type FoodOverviewType<M> = Functor<M> &
	GetNow<M> &
	GetFoodOverview<M> &
	Take<M> &
	SwitchMap<M>

export function foodOverview<M extends URIS>(
	M: FoodOverviewType1<M>
): Kind<M, FoodOverviewViewModel>
export function foodOverview<M>(
	M: FoodOverviewType<M>
): HKT<M, FoodOverviewViewModel> {
	return M.switchMap(M.foods, () =>
		M.map(
			M.take(M.getNow, 1),
			E.fold(
				error => ({ foods: RoM.empty, error: O.some(error) }),
				() => ({ foods: RoM.empty, error: O.none })
			)
		)
	)
}
