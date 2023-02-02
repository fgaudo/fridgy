import { Observable } from 'rxjs'

import { FoodPageModel } from '@/application/read/food-page'

export interface UseCases {
	readonly foodsPageModel$: Observable<FoodPageModel>
}
