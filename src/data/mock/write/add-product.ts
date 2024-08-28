/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff } from '@/core/imports.js'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product.js'

import { withErrors } from '../constants.js'
import { map } from '../db.js'

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
