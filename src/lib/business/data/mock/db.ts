import {
	Eff,
	HM,
	Ref,
} from '$lib/core/imports.ts'

import { GetSortedProducts } from '$lib/business/app/operations'

export class Db extends Eff.Service<Db>()(
	'data/mock/Db',
	{
		effect: Eff.gen(function* () {
			return yield* Ref.make({
				index: 0,
				map: HM.empty<
					string,
					GetSortedProducts.ProductDTO
				>(),
			})
		}),
	},
) {}
