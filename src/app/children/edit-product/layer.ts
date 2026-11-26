import * as Layer from 'effect/Layer'
import * as Expiration from '#app/programs/expiration/layer.ts'
import * as UpdateProductSql from './services/update-product/update-product.sql.ts'

export const layer = Layer.mergeAll(Expiration.layer, UpdateProductSql.layer)
