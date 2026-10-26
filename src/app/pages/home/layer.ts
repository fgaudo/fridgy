import * as Layer from 'effect/Layer'
import * as DeleteProductsSql from './parts/products/services/delete-products/delete-products.sql.ts'
import * as ProductListSql from './parts/products/services/product-list/product-list.sql.ts'
import * as ViewportBrowser from './services/viewport/viewport.browser.ts'

export const layer = Layer.mergeAll(DeleteProductsSql.layer, ProductListSql.layer, ViewportBrowser.layer)
