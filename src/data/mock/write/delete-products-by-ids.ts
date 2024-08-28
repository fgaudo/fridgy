/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, HS } from '@/core/imports.js'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids.js'

import { withErrors } from '../constants.js'
import { map } from '../db.js'

export const command: (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError
> = ids =>
	Eff.gen(function* () {
		if (withErrors && Math.random() < 0.5) {
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError('ciao'),
			)
		}

		for (const id of ids) {
			map.delete(id)
		}
	})
