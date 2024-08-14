import { Eff } from '@/core/imports'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

export const command: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError
> = () =>
	Eff.gen(function* () {
		if (Math.random() < 0.5) {
			return yield* Eff.fail(
				AddProductServiceError('ciao'),
			)
		}
	})
