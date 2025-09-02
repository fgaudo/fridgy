import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Ref from 'effect/Ref'

import { GetSortedProducts } from '$lib/business/app/operations'

export class Db extends Effect.Service<Db>()(`data/mock/Db`, {
	effect: Ref.make({
		index: 0,
		map: HashMap.empty<string, GetSortedProducts.ProductDTO>(),
	}),
}) {}
