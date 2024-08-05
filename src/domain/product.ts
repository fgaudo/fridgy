import {
	either as E,
	eq as Eq,
	function as F,
	option as OPT,
} from 'fp-ts'
import { type Newtype, iso } from 'newtype-ts'

import type { AtLeastOne } from '@/core/types'

const isoProduct = iso<Product>()
const pipe = F.pipe

export type Product = Newtype<
	{ readonly Product: unique symbol },
	{
		name: string
		expiration: OPT.Option<number>
	}
>

export const name: (
	product: Product,
) => string = product =>
	isoProduct.unwrap(product).name

export const expiration: (
	product: Product,
) => OPT.Option<number> = product =>
	isoProduct.unwrap(product).expiration

export const isExpired: (
	product: Product,
	timestamp: number,
) => boolean = (product, timestamp) =>
	pipe(
		isoProduct.unwrap(product).expiration,
		OPT.match(
			() => false,
			expDate => expDate >= timestamp,
		),
	)

export const Product = {
	Eq: Eq.fromEquals(() => false),
} as const

export const enum NameError {
	missingName = 0,
}

interface Errors {
	name: NameError
}

export const createProduct: (f: {
	name: string
	expiration?: OPT.Option<number>
}) => E.Either<
	AtLeastOne<Errors>,
	Product
> = productData => {
	let errors: Partial<Errors> = {}

	if (productData.name.trim().length <= 0) {
		errors = {
			...errors,
			name: NameError.missingName,
		}
	}

	if (Object.keys(errors).length > 0) {
		return E.left(errors as AtLeastOne<Errors>)
	}

	return E.right(
		isoProduct.wrap({
			name: productData.name,
			expiration:
				productData.expiration ?? OPT.none,
		}),
	)
}
