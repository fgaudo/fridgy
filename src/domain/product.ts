import { E, O } from '@/core/imports'

const productSymbol: unique symbol = Symbol()

export interface Product {
	[productSymbol]: {
		name: string
		expirationDate: O.Option<number>
	}
}

export const createProduct: (f: {
	name: string
	expirationDate: O.Option<number>
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
