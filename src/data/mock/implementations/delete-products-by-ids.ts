/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, L } from '@/core/imports.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/delete-products-by-ids.ts'

import { withErrors } from '../constants.ts'
import { map } from '../db.ts'

export const command = L.succeed(
	DeleteProductsByIdsService,
	ids =>
		Eff.gen(function* () {
			if (withErrors && Math.random() < 0.5) {
				return yield* Eff.fail(undefined)
			}

			for (const id of ids) {
				map.delete(id)
			}
		}),
)
