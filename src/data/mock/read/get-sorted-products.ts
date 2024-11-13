/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { pipe } from 'effect'

import {
	A,
	E,
	Eff,
	NNInt,
	O,
	Ord,
} from '@/core/imports.ts'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products.ts'
import type { ProductModel } from '@/app/use-cases/get-sorted-products.ts'

import { withErrors } from '../constants.ts'
import { map } from '../db.ts'

const ord = Ord.make(
	(p1: ProductModel, p2: ProductModel) => {
		if (E.isRight(p1) && E.isLeft(p2)) {
			return -1
		}

		if (E.isLeft(p1) && E.isRight(p2)) {
			return 1
		}

		if (E.isRight(p1) && E.isRight(p2)) {
			return Ord.combineAll([
				pipe(
					Ord.number,
					Ord.reverse,
					O.getOrder,
					Ord.reverse,
					Ord.mapInput(
						(product: typeof p1) =>
							product.right.expirationDate,
					),
				),
				pipe(
					Ord.string,
					Ord.mapInput(
						(product: typeof p1) =>
							product.right.name,
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
	).map(elem => E.right(elem))

	return {
		total: NNInt.unsafe_fromNumber(total),
		products: A.sort(ord)(products),
	}
})
