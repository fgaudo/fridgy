/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff } from '@/core/imports'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'
import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { withErrors } from '../constants'
import { map } from '../db'

export const query: Eff.Effect<
	{
		total: number
		products: ProductDTO[]
	},
	ProductsServiceError
> = Eff.gen(function* () {
	if (withErrors && Math.random() < 0.5)
		return yield* Eff.fail(
			ProductsServiceError('ciao'),
		)

	const total = map.size

	const products: ProductModel[] = Array.from(
		map.values(),
	).map(elem => ({
		...elem,
		isValid: true,
	}))

	return { total, products }
})
