import * as B from 'effect/Brand'

import { E, O, flow } from '@/core/imports'

export type Product = {
	name: string
	expiration: O.Option<number>
} & B.Brand<'Product'>

export const createProduct: (f: {
	name: string
	expiration?: O.Option<number>
}) => E.Either<Product, string> = flow(
	E.liftPredicate(
		product => product.name.trim().length >= 0,
		() => 'Empty name given',
	),
	E.map(product => ({
		name: product.name,
		expiration: product.expiration ?? O.none(),
	})),
	E.map(B.nominal()),
)
