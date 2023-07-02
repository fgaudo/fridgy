import { Observable } from 'rxjs'

import { FoodData } from '@/domain/food'

export type FoodEntry = Readonly<
	FoodData & {
		id: string
	}
>

export type Sorting = 'name' | 'date'

export type OnFoods = NonNullable<
	(sort: Sorting) => Observable<readonly FoodEntry[]>
>
