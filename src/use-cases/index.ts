import * as Layer from 'effect/Layer'

import { DeleteProductsByIds } from '../business/use-cases/delete-products-by-ids.ts'
import { GetProducts } from '../business/use-cases/get-products.ts'

export type All = GetProducts | DeleteProductsByIds

export const all = Layer.mergeAll(GetProducts.layer, DeleteProductsByIds.layer)
