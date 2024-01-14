import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

import { FoodInputDTO } from '@/app/types/food'

export type AddFood = (
	food: FoodInputDTO,
) => TE.TaskEither<Error, void>

export type R_AddFood<ENV> = (
	food: FoodInputDTO,
) => RTE.ReaderTaskEither<ENV, Error, void>
