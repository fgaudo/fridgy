/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff } from '@/core/imports'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

import { withErrors } from '../constants'
import { map } from '../db'

let i = 0

export const command: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError
> = product =>
	Eff.gen(function* () {
		if (withErrors && Math.random() < 0.5) {
			return yield* Eff.fail(
				AddProductServiceError('ciao'),
			)
		}

		const index = (i++).toString(10)
		map.set(index, {
			...product,
			id: index,
		})
	})
