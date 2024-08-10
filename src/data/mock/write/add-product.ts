import { Eff } from '@/core/imports'

import type {
	AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

export const addProduct: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError
> = () =>
	Eff.gen(function* () {
		yield* Eff.sleep(250)
	})
