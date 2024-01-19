import {
	type Either,
	left,
	right,
} from 'fp-ts/lib/Either'
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
}) => Either<
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
		return left(errors as AtLeastOne<Errors>)
	}
	return right(isoProduct.wrap(productData))
}
