import {
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: NETS.NonEmptyTrimmedString
		maybeExpirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	}
}

export const createProduct: (f: {
	name: NETS.NonEmptyTrimmedString
	creationDate: Int.Integer
	maybeExpirationDate: O.Option<Int.Integer>
}) => O.Option<Product> = ({
	name,
	creationDate,
	maybeExpirationDate,
}) =>
	O.some({
		[productSymbol]: {
			name,
			creationDate,
			maybeExpirationDate,
		},
	})

export const name = (product: Product) =>
	product[productSymbol].name

export const maybeExpirationDate = (
	product: Product,
) => product[productSymbol].maybeExpirationDate

export const creationDate = (product: Product) =>
	product[productSymbol].creationDate
