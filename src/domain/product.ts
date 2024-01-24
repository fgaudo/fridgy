import { either as E } from 'fp-ts'
import { type Newtype, iso } from 'newtype-ts'

import type { AtLeastOne } from '@/core/types'

const isoProduct = iso<Product>()

export type Product = Newtype<
	{ readonly Product: unique symbol },
	{ name: string; expDate: number }
>

export const name: (
	product: Product,
) => string = product =>
	isoProduct.unwrap(product).name

export const expDate: (
	product: Product,
) => number = product =>
	isoProduct.unwrap(product).expDate

export const isExpired: (
	product: Product,
	timestamp: number,
) => boolean = (product, timestamp) =>
	isoProduct.unwrap(product).expDate >= timestamp

export const areEqual = (
	_p1: Product,
	_p2: Product,
) => false

export const enum NameError {
	missingName = 0,
}

interface Errors {
	name: NameError
}

export const createProduct: (f: {
	name: string
	expDate: number
}) => E.Either<
	AtLeastOne<Errors>,
	Product
> = productData => {
	let errors: Partial<Errors> = {}

	if (productData.name.trim().length > 0) {
		errors = {
			...errors,
			name: NameError.missingName,
		}
	}

	if (Object.keys(errors).length > 0) {
		return E.left(errors as AtLeastOne<Errors>)
	}
	return E.right(isoProduct.wrap(productData))
}
