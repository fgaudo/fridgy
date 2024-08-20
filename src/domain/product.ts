import { E, O } from '@/core/imports'
import type { Integer } from '@/core/integer'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: string
		expirationDate: O.Option<Integer>
	}
}

export const createProduct: (f: {
	name: string
	expirationDate: O.Option<Integer>
}) => E.Either<
	Product,
	string[]
> = productDummy =>
	E.gen(function* () {
		let errors: string[] = []
		const name = productDummy.name.trim()
		if (name.length <= 0) {
			errors = [...errors, 'Empty name given']
		}

		return errors.length <= 0
			? {
					[productSymbol]: {
						name,
						expirationDate:
							productDummy.expirationDate,
					},
				}
			: yield* E.left(errors)
	})

export const name = (product: Product) =>
	product[productSymbol].name

export const expirationDate = (
	product: Product,
) => product[productSymbol].expirationDate
