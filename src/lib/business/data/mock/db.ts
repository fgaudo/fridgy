import { HashMap, Ref } from 'effect'

import { Eff } from '$lib/core/imports.ts'

import { GetSortedProducts } from '$lib/business/app/operations'

export class Db extends Eff.Service<Db>()(
	'data/mock/Db',
	{
		effect: Eff.gen(function* () {
			return yield* Ref.make({
				index: 0,
				map: HashMap.empty<
					string,
					GetSortedProducts.ProductDTO
				>(),
			})
		}),
	},
) {}
