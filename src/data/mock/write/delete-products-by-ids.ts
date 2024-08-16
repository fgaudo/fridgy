/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, HS } from '@/core/imports'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

import { withErrors } from '../constants'
import { map } from '../db'

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
