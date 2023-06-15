import { Observable } from 'rxjs'

import { Sorting } from '../usecase/food-overview'

export interface FoodData {
	readonly id: string
	readonly name: string
	readonly expDate: Date
}

export type Foods = (sort: Sorting) => Observable<ReadonlyArray<FoodData>>
