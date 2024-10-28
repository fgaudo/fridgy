/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, HS } from '@/core/imports.ts'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids.ts'

import { withErrors } from '../constants.ts'
import { map } from '../db.ts'

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
