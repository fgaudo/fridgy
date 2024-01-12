import {
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import { FoodInputDTO } from '@/app/types/food'

export type AddFood = (
	food: FoodInputDTO,
) => TE.TaskEither<Error, void>

export type R_AddFood<ENV> = (
	food: FoodInputDTO,
) => RTE.ReaderTaskEither<ENV, Error, void>
