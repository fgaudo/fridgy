import { Either } from 'fp-ts/lib/Either'
import { Single } from 'src/core/rxjs'

import { FoodEntity } from '../types/food'

export type AddFood = (food: FoodEntity) => Single<Either<string, void>>
