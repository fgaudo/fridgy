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
	yield* Eff.sleep(1000)

	let array: ProductDTO[] = []

	for (const id of A.range(0, 19)) {
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
				creationDate: Date.now(),
				expirationDate: O.some(
					Date.now() +
						100000 +
						Math.floor(Math.random() * 26967228),
				),
			} as const,
		]
	}

	return { total: 20, products: array }
})
