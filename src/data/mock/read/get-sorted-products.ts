import { A, Eff, O } from '@/core/imports'

import {
	type ProductDTO,
	type ProductsServiceError,
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
	yield* Eff.sleep(0)

	let array: ProductDTO[] = []

	for (const _ of A.range(0, 19)) {
		array = [
			...array,
			{
				isValid: true,
				id: Math.floor(
					Math.random() * 2696722838291372,
				).toString(10),
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

	array = [...array]
	return { total: array.length, products: array }
})
