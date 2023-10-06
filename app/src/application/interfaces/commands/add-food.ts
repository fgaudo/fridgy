import { Exception } from '@/core/exception'

import { FoodData } from '@/domain/food'

export type FoodEntry = Readonly<
	FoodData & {
		id: string
	}
>

/** Returns an error if the computation fails */
export type AddFood = (food: FoodEntry) => Maybe<Exception>
