/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
	A,
	Eff,
	Int,
	NETS,
	NNInt,
	O,
	Ord,
	pipe,
} from '@/core/imports'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'
import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { withErrors } from '../constants'
import { map } from '../db'

const ord = Ord.make(
	(p1: ProductModel, p2: ProductModel) => {
		if (p1.isValid && !p2.isValid) {
			return -1
		}

		if (!p1.isValid && p2.isValid) {
			return 1
		}

		if (p1.isValid && p2.isValid) {
			return Ord.combineAll([
				pipe(
					Int.order,
					Ord.reverse,
					O.getOrder,
					Ord.reverse,
					Ord.mapInput(
						(product: typeof p1) =>
							product.expirationDate,
					),
				),
				pipe(
					NETS.order,
					Ord.mapInput(
						(product: typeof p1) => product.name,
					),
				),
			])(p1, p2)
		}

		return 0
	},
)

export const query: Eff.Effect<
	{
		total: NNInt.NonNegativeInteger
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

	return {
		total: NNInt.unsafe_fromNumber(total),
		products: A.sort(ord)(products),
	}
})
