import { A, Eff, O } from '@/core/imports'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'

const productSamples = [
	'Milk',
	'Eggs',
	'Philadelphia',
	'Yogurt',
	'Broccoli',
]

export const query: Eff.Effect<
	{
		total: number
		products: ProductDTO[]
	},
	ProductsServiceError
> = Eff.gen(function* () {
	if (Math.random() < 0.5)
		return yield* Eff.fail(
			ProductsServiceError('ciao'),
		)

	let array: ProductDTO[] = []

	const number = Math.floor(Math.random() * 20)

	for (const id of A.range(0, number)) {
		array = [
			...array,
			{
				isValid: true,
				id: id.toString(10),
				name: productSamples[
					Math.floor(
						Math.random() * productSamples.length,
					)
				],
				creationDate:
					Date.now() -
					Math.floor(Math.random() * 26967228),
				expirationDate: O.some(
					Date.now() +
						100000 +
						Math.floor(Math.random() * 26967228),
				),
			},
		] satisfies ProductDTO[]
	}

	array = [
		...array,
		{
			isValid: false,
			id: O.some('-1'),
			name: O.none(),
		},

		{
			isValid: false,
			id: O.some('-2'),
			name: O.some('Corrupt1'),
		},

		{
			isValid: false,
			id: O.none(),
			name: O.some('Corrupt2'),
		},

		{
			isValid: false,
			id: O.none(),
			name: O.none(),
		},
	]
	return { total: array.length, products: array }
})
