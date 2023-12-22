import { Reader } from 'fp-ts/Reader'
import { Observable } from 'rxjs'

import { Food } from '@/domain/food'

export interface FoodData {
	readonly name: string
}

export type Foods = Observable<FoodData[]>
export type FoodsWithDeps<ENV> = Reader<ENV, Observable<FoodData[]>>

export function toFoodEntity(foodDatas: FoodData[]): Food[] {
	return [{ name: 'asd' }]
}
