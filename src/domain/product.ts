import { E, O } from '@/core/imports'

export interface Product {
	name: string
	expiration: O.Option<number>
}

export const createProduct: (f: {
	name: string
	expiration?: O.Option<number>
}) => E.Either<
	Product,
	string[]
> = productDummy =>
	E.gen(function* () {
		let errors: string[] = []
		if (productDummy.name.trim().length <= 0) {
			errors = [...errors, 'Empty name given']
		}

		return errors.length <= 0
			? {
					name: productDummy.name,
					expiration:
						productDummy.expiration ?? O.none(),
				}
			: yield* E.left(errors)
	})
