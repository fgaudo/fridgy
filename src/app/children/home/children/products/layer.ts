import * as Layer from 'effect/Layer'
import * as DeleteProductsSql from './services/delete-products/delete-products.sql.ts'
import * as ProductListSql from './services/product-list/product-list.sql.ts'

export const layer = Layer.mergeAll(DeleteProductsSql.layer, ProductListSql.layer)
