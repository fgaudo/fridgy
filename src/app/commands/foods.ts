import { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

import { Food } from '@/domain/food'

export interface FoodData {
	readonly name: string
}

export type Foods = Observable<FoodData[]>
export type FoodsWithDeps<ENV> = R.Reader<ENV, Observable<FoodData[]>>

export function toFoodEntity(foodDatas: FoodData[]): Food[] {
	return [{ name: 'asd' }]
}
