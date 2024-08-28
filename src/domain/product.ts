import { Int, NETS, O } from '@/core/imports.js'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
	}
}

export const createProduct: (f: {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
}) => Product = productDummy => ({
	[productSymbol]: productDummy,
})

export const name = (product: Product) =>
	product[productSymbol].name

export const expirationDate = (
	product: Product,
) => product[productSymbol].expirationDate
