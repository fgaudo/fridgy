import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

export interface ProductInputDTO {
	name: string
	expDate:
		| {
				timestamp: number
				isBestBefore: boolean
		  }
		| undefined
}
export type AddProduct = (
	product: ProductInputDTO,
) => TaskOption<Error>

export type R_AddProduct<ENV> = (
	product: ProductInputDTO,
) => Reader<ENV, TaskOption<Error>>
