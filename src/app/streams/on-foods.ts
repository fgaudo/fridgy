import { readerObservable as RO } from 'fp-ts-rxjs'
import { Observable } from 'rxjs'

import { FoodData } from '@/app/types/food'

export type OnFoods = Observable<
	ReadonlySet<FoodData>
>
export type OnFoodsWithDeps<ENV> =
	RO.ReaderObservable<ENV, ReadonlySet<FoodData>>
