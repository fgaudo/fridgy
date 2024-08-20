import { Context } from 'effect'
import type { Effect } from 'effect/Effect'
import type { Option } from 'effect/Option'

import { B } from '@/core/imports'
import type { Integer } from '@/core/integer'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

export type ProductDTO =
	| {
			isValid: true
			id: string
			name: NonEmptyTrimmedString
			expirationDate: Option<Integer>
			creationDate: Integer
	  }
	| {
			isValid: false
			id: Option<string>
			name: Option<NonEmptyTrimmedString>
	  }

export class ProductsService extends Context.Tag(
	'ProductsService',
)<
	ProductsService,
	Effect<
		{
			total: Integer
			products: ProductDTO[]
		},
		ProductsServiceError
	>
>() {}

export type ProductsServiceError = string &
	B.Brand<'ProductsServiceError'>

export const ProductsServiceError =
	B.nominal<ProductsServiceError>()
