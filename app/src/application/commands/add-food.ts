import { Option } from 'fp-ts/lib/Option'
import { Single } from 'src/core/rxjs'

import { FoodData } from '@/domain/food'

export type FoodEntry = Readonly<
	FoodData & {
		id: string
	}
>

/** Returns an error if the computation fails */
export type AddFood = (food: FoodEntry) => Single<Option<string>>
