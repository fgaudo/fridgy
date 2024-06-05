import { either as E, option as OPT } from 'fp-ts'
import { fromEquals } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import { type Newtype, iso } from 'newtype-ts'

import type { AtLeastOne } from '@/core/types'

const isoProduct = iso<Product>()

export type Product = Newtype<
	{ readonly Product: unique symbol },
	{
		name: string
		expDate: OPT.Option<
			Readonly<{
				isBestBefore: boolean
				timestamp: number
			}>
		>
	}
>

export const name: (
	product: Product,
) => string = product =>
	isoProduct.unwrap(product).name

export const expDate: (
	product: Product,
) => OPT.Option<number> = product =>
	pipe(
		isoProduct.unwrap(product).expDate,
		OPT.map(exp => exp.timestamp),
	)

export const isExpired: (
	product: Product,
	timestamp: number,
) => boolean = (product, timestamp) =>
	pipe(
		isoProduct.unwrap(product).expDate,
		OPT.match(
			() => false,
			expDate => expDate.timestamp >= timestamp,
		),
	)

export const isBestBefore: (
	product: Product,
) => boolean = product =>
	pipe(
		isoProduct.unwrap(product).expDate,
		OPT.match(
			() => false,
			exp => exp.isBestBefore,
		),
	)

export const Eq = fromEquals(() => false)

export const enum NameError {
	missingName = 0,
}

interface Errors {
	name: NameError
}

export const createProduct: (f: {
	name: string
	expDate?:
		| {
				isBestBefore: boolean
				timestamp: number
		  }
		| undefined
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

	return E.right(
		isoProduct.wrap({
			name: productData.name,
			expDate: OPT.fromNullable(
				productData.expDate,
			),
		}),
	)
}
