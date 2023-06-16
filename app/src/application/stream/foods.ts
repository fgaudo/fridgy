import { Observable } from 'rxjs'

import { FoodData } from '@/domain/food'

import { Sorting } from '../usecase/food-overview'

export type Foods = (sort: Sorting) => Observable<ReadonlyArray<FoodData>>
