import { L } from '@/core/imports.ts'

import { app } from '@/app/index.ts'

import { command as addProduct } from './implementations/add-product.ts'
import { command as deleteProductsByIds } from './implementations/delete-products-by-ids.ts'
import { query as getSortedProducts } from './implementations/get-sorted-products.ts'

export const appMock = app.pipe(
	L.provide(addProduct),
	L.provide(getSortedProducts),
	L.provide(deleteProductsByIds),
)
