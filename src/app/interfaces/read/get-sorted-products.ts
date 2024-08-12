import { Context } from 'effect'
import type { Effect } from 'effect/Effect'
import type { Option } from 'effect/Option'

import { B } from '@/core/imports'

export type ProductDTO =
	| {
			isValid: true
			id: string
			name: string
			expirationDate: Option<number>
			creationDate: number
	  }
	| {
			isValid: false
			id: Option<string>
			name: Option<string>
	  }

export class ProductsService extends Context.Tag(
	'ProductsService',
)<
	ProductsService,
	Effect<
		{
			total: number
			products: ProductDTO[]
		},
		ProductsServiceError
	>
>() {}

export type ProductsServiceError = string &
	B.Brand<'ProductsServiceError'>

export const ProductsServiceError =
	B.nominal<ProductsServiceError>()
