import { Observable } from 'rxjs'

import { FoodEntity } from '../types/food'
import { Sorting } from '../usecase/food-overview'

export type OnFoods = (sort: Sorting) => Observable<ReadonlyArray<FoodEntity>>
