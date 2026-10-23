import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from './notifications/notifications.capacitor.ts'
import * as AddProductsSql from './parts/add-product/add-products/add-products.sql.ts'
import * as DeleteProductsSql from './parts/products/delete-products/delete-products.sql.ts'
import * as ProductListSql from './parts/products/product-list/product-list.sql.ts'
import * as ViewportBrowser from './parts/scrolling/viewport/viewport.browser.ts'

export const layer = Layer.mergeAll(
  AddProductsSql.layer,
  DeleteProductsSql.layer,
  ProductListSql.layer,
  ViewportBrowser.layer,
  NotificationsCapacitor.layer,
)
