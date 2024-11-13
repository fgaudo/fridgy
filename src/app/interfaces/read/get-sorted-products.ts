import { Context } from 'effect'

import {
	B,
	E,
	Eff,
	Int,
	NETS,
	NNInt,
	O,
} from '@/core/imports.ts'

export type ProductDTO = E.Either<
	{
		id: string
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	},
	{
		id: O.Option<string>
		name: O.Option<NETS.NonEmptyTrimmedString>
	}
>

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
