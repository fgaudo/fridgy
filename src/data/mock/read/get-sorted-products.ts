import { Eff } from '@/core/imports'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'
import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { array } from '../db'

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

	const total = array.length
	const products: ProductModel[] = array.map(
		elem => ({
			...elem,
			isValid: true,
		}),
	)

	return { total, products }
})
