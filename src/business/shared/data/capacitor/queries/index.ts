import * as Layer from 'effect/Layer'

import { Db } from '@/shared/data/capacitor/db.ts'

import { command as deleteProduct } from './delete-product-by-id.ts'
import { query as getProducts } from './get-sorted-products.ts'

export const implementations = Layer.provide(
	Layer.mergeAll(getProducts, deleteProduct),
	Db.Default,
)
