import { Eff, type HS } from '@/core/imports'

import type { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

export const command: (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError
> = () => Eff.void
