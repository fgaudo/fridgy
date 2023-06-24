import { Observable } from 'rxjs'

import { FoodData } from '@/domain/food'

import { Sorting } from '../usecases/food-overview'

export type FoodEntry = Readonly<
	FoodData & {
		id: string
	}
>

export type OnFoods = (sort: Sorting) => Observable<ReadonlyArray<FoodEntry>>
