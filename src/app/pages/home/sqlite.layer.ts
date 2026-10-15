import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from './adapters/notifications/capacitor.ts'
import * as ProductListSql from './adapters/product-list/sql.ts'
import * as ViewportBrowser from './adapters/viewport/browser.ts'

export const layer = Layer.mergeAll(
  ProductListSql.layer,
  ViewportBrowser.layer,
  NotificationsCapacitor.layer,
)
