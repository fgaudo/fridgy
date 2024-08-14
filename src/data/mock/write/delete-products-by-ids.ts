import { Eff, HS } from '@/core/imports'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

import { array } from '../db'

export const command: (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError
> = ids =>
	Eff.gen(function* () {
		if (Math.random() < 0.5) {
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError('ciao'),
			)
		}

		for (const [key, item] of array.entries()) {
			if (HS.has(item.id)(ids)) {
				array.splice(key, 1)
			}
		}
	})
