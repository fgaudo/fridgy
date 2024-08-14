import { Eff } from '@/core/imports'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

import { array } from '../db'

let i = 0

export const command: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError
> = product =>
	Eff.gen(function* () {
		if (Math.random() < 0.5) {
			return yield* Eff.fail(
				AddProductServiceError('ciao'),
			)
		}

		array.push({
			...product,
			id: (i++).toString(10),
		})
	})
