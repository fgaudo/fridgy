import {
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'
import {
	type OptionOrValue,
	asOption,
} from '$lib/core/utils.ts'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	}
}

export const createProduct: (f: {
	maybeName: OptionOrValue<NETS.NonEmptyTrimmedString>
	maybeCreationDate: OptionOrValue<Int.Integer>
	maybeExpirationDate: OptionOrValue<Int.Integer>
}) => O.Option<Product> = product =>
	O.gen(function* () {
		const name = yield* asOption(
			product.maybeName,
		)

		const creationDate = yield* asOption(
			product.maybeCreationDate,
		)

		const expirationDate = asOption(
			product.maybeExpirationDate,
		)

		return {
			[productSymbol]: {
				name,
				creationDate,
				expirationDate,
			},
		}
	})

export const name = (product: Product) =>
	product[productSymbol].name

export const maybeExpirationDate = (
	product: Product,
) => product[productSymbol].expirationDate

export const creationDate = (product: Product) =>
	product[productSymbol].creationDate
