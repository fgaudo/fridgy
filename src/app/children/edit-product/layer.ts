import * as Layer from 'effect/Layer'
import * as DateOrderSettingSql from './services/date-order-setting/date-order-setting.sql.ts'
import * as UpdateProductSql from './services/update-product/update-product.sql.ts'

export const layer = Layer.mergeAll(DateOrderSettingSql.layer, UpdateProductSql.layer)
