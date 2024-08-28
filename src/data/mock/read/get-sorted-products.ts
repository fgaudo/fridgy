/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { pipe } from 'effect'

import {
	A,
	Eff,
	NNInt,
	O,
	Ord,
} from '@/core/imports.js'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products.js'
import type { ProductModel } from '@/app/use-cases/get-sorted-products.js'

import { withErrors } from '../constants.js'
import { map } from '../db.js'

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
					Ord.number,
					Ord.reverse,
					O.getOrder,
					Ord.reverse,
					Ord.mapInput(
						(product: typeof p1) =>
							product.expirationDate,
					),
				),
				pipe(
					Ord.string,
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
