import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as GetSortedProducts from '@/shared/app/queries/get-sorted-products.ts'
import { Db } from '@/shared/data/capacitor/db'

export const query = Layer.effect(
	GetSortedProducts.GetSortedProducts,
	Effect.gen(function* () {
		return { run: (yield* Db).getAllProductsWithTotal }
	}),
)
