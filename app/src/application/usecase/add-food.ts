import { TaskEither, chain, fromEither } from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'

import { FoodData, deserialize, serialize } from '@/domain/food'

import { AddFood } from '../command/add-food'

export type FoodModel = Omit<FoodData, 'id'>

export type AddFoodDeps = Readonly<{ addFood: AddFood }>

export const addFood =
	(deps: AddFoodDeps) =>
	(food: FoodModel): TaskEither<string, void> =>
		pipe(
			deserialize({ id: '', ...food }),
			fromEither,
			chain(food => pipe(food, serialize, deps.addFood))
		)
