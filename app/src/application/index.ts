import { Task } from 'fp-ts/Task'
import { Observable } from 'rxjs'

import {
	FoodOverviewViewModel,
	GetFoodOverview
} from '@/application/food-overview'

export type UseCases = {
	foodOverview: GetFoodOverview
}
