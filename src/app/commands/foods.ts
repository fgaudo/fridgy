import { readerObservable as RO } from 'fp-ts-rxjs'
import * as E from 'fp-ts/Eq'
import * as t from 'io-ts'
import { Observable } from 'rxjs'

import { Food } from '@/domain/food'

export type Foods = Observable<ReadonlySet<FoodData>>
export type FoodsWithDeps<ENV> = RO.ReaderObservable<ENV, ReadonlySet<FoodData>>

export function toFoodEntity(foodDatas: FoodData): Food {
	return { name: 'asd' }
}

export const FoodData = t.type({
	id: t.string,
	name: t.string
})

export type FoodData = t.TypeOf<typeof FoodData>

export const Eq: E.Eq<FoodData> = E.fromEquals((a, b) => a.id === b.id)
