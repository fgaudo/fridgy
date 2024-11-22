import { Context } from 'effect'

import {
	Eff,
	Int,
	NETS,
	NNInt,
	O,
} from '@/core/imports.ts'

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

export class GetSortedProductsService extends Context.Tag(
	'ProductsService',
)<
	GetSortedProductsService,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger
			products: ProductDTO[]
		},
		void
	>
>() {}
