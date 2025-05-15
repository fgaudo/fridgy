import { B, Int, NETS, O } from '$lib/core/imports.ts'

export type Product = B.Branded<
	{
		name: NETS.NonEmptyTrimmedString
		maybeExpirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	},
	`Product`
>

/** @internal */
export const Product = B.refined<Product>(
	() => true,
	() => B.error(`Product is invalid`),
)

export const fromStruct = Product.option
