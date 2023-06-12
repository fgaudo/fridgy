import { Pipe } from 'src/core/pipe'

import {
	FoodOverviewCmd,
	FoodOverviewViewModel
} from '@/application/food-overview'

export type UseCases = {
	foodOverview: Pipe<FoodOverviewCmd, FoodOverviewViewModel>
}
