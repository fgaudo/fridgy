import { O } from '@/core/imports'
import type { Integer } from '@/core/integer'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: NonEmptyTrimmedString
		expirationDate: O.Option<Integer>
	}
}

export const createProduct: (f: {
	name: NonEmptyTrimmedString
	expirationDate: O.Option<Integer>
}) => Product = productDummy => ({
	[productSymbol]: productDummy,
})

export const name = (product: Product) =>
	product[productSymbol].name

export const expirationDate = (
	product: Product,
) => product[productSymbol].expirationDate
