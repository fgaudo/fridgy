import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

export interface ProductInputDTO<ID> {
	id: ID
	name: string
	expDate: {
		timestamp: number
		isBestBefore: boolean
	}
}
export type AddProduct<ID> = (
	product: ProductInputDTO<ID>,
) => TaskOption<Error>

export type R_AddProduct<ENV, ID> = (
	product: ProductInputDTO<ID>,
) => Reader<ENV, TaskOption<Error>>
