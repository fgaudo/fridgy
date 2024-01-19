import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

export interface ProductInputDTO {
	name: string
	expDate: number
}
export type AddProduct = (
	product: ProductInputDTO,
) => TE.TaskEither<Error, void>

export type R_AddProduct<ENV> = (
	product: ProductInputDTO,
) => RTE.ReaderTaskEither<ENV, Error, void>
