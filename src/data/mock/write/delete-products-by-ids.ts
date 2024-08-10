import { Eff, type H } from '@/core/imports'

import type { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

export const deleteProductsByIds: (
	ids: H.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError
> = () =>
	Eff.gen(function* () {
		yield* Eff.sleep(250)
	})
