import { Context } from 'effect'

import {
	B,
	Eff,
	Int,
	NETS,
	NNInt,
	O,
} from '@/core/imports.js'

export type ProductDTO =
	| {
			isValid: true
			id: string
			name: NETS.NonEmptyTrimmedString
			expirationDate: O.Option<Int.Integer>
			creationDate: Int.Integer
	  }
	| {
			isValid: false
			id: O.Option<string>
			name: O.Option<NETS.NonEmptyTrimmedString>
	  }

export class ProductsService extends Context.Tag(
	'ProductsService',
)<
	ProductsService,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger
			products: ProductDTO[]
		},
		ProductsServiceError
	>
>() {}

export type ProductsServiceError = string &
	B.Brand<'ProductsServiceError'>

export const ProductsServiceError =
	B.nominal<ProductsServiceError>()
