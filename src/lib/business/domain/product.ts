import { B, Int, NETS, O, Sc } from '$lib/core/imports.ts'

export type Product = B.Branded<
	{
		name: NETS.NonEmptyTrimmedString
		maybeExpirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
		maybeStorage: O.Option<'freezer' | 'fridge'>
	},
	`Product`
>

/** @internal */
export const Product = B.refined<Product>(
	() => true,
	() => B.error(`Product is invalid`),
)

export const ProductSchema = Sc.fromBrand(Product)(
	Sc.Struct({
		name: NETS.NonEmptyTrimmedStringSchema,
		maybeExpirationDate: Sc.Option(Int.IntegerSchema),
		creationDate: Int.IntegerSchema,
		maybeStorage: Sc.Option(
			Sc.Union(Sc.Literal('freezer'), Sc.Literal('fridge')),
		),
	}),
)

export const fromStruct = (...p: Parameters<typeof Product.option>) =>
	Product.option(...p)
