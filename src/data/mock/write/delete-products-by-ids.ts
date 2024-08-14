import { Eff, type HS } from '@/core/imports'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

export const command: (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError
> = () =>
	Eff.gen(function* () {
		if (Math.random() < 0.5) {
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError('ciao'),
			)
		}
	})
