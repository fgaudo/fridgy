import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from './adapters/notifications/capacitor.ts'
import * as ProductsSql from './adapters/products/sql.ts'
import * as ViewportBrowser from './adapters/viewport/browser.ts'

/** Every port of the page, backed by sqlite, the browser window and Capacitor. */
export const layer = Layer.mergeAll(
  ProductsSql.layer,
  ViewportBrowser.layer,
  NotificationsCapacitor.layer,
)
