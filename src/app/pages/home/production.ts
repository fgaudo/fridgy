import * as Layer from 'effect/Layer'

import { addProductLayer } from '@/app/pages/home/adapters/add-product/live.ts'
import { deleteProductsLayer } from '@/app/pages/home/adapters/delete-product-by-id/live.ts'

export const homeLayer = Layer.mergeAll(deleteProductsLayer, addProductLayer)
