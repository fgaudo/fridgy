import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'

export interface ProductInputDTO<ID> {
	id: ID
	name: string
	expDate: number
}
export type AddProduct<ID> = (
	product: ProductInputDTO<ID>,
) => TE.TaskEither<Error, void>

export type R_AddProduct<ENV, ID> = (
	product: ProductInputDTO<ID>,
) => RTE.ReaderTaskEither<ENV, Error, void>
