/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, L } from '@/core/imports.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

import { withErrors } from '../constants.ts'
import { map } from '../db.ts'

let i = 0

export const command = L.succeed(
	AddProductService,
	product =>
		Eff.gen(function* () {
			if (withErrors && Math.random() < 0.5) {
				return yield* Eff.fail(undefined)
			}

			const index = (i++).toString(10)
			map.set(index, {
				...product,
				id: index,
			})
		}),
)
