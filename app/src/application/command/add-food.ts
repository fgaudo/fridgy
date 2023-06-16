import { TaskEither } from 'fp-ts/lib/TaskEither'

import { FoodData } from '@/domain/food'

export type AddFood = (food: FoodData) => TaskEither<string, void>
