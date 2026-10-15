// Kept apart from `sqlite.layer.ts` so that bundles using it do not pull in sqlite.
import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from './adapters/notifications/capacitor.ts'
import * as ProductListInMemory from './adapters/product-list/in-memory.ts'
import * as ViewportBrowser from './adapters/viewport/browser.ts'

export const layer = Layer.mergeAll(
  ProductListInMemory.layer,
  ViewportBrowser.layer,
  NotificationsCapacitor.layer,
)
