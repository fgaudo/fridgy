import { Context } from 'effect'
import type { Effect } from 'effect/Effect'
import type { Option } from 'effect/Option'

export interface ProductDTO {
	id: string
	name: string
	expirationDate: Option<number>
	creationDate: number
}

export class ProductsService extends Context.Tag(
	'ProductsService',
)<
	ProductsService,
	Effect<
		{
			total: number
			products: readonly ProductDTO[]
		},
		string
	>
>() {}
