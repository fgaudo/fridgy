// Kept apart from `sqlite.layer.ts` so that bundles using it do not pull in sqlite.
import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from './adapters/notifications/capacitor.ts'
import * as ProductsInMemory from './adapters/products/in-memory.ts'
import * as ViewportBrowser from './adapters/viewport/browser.ts'

/** Like `./sqlite.layer.ts`, but products are kept in memory. */
export const layer = Layer.mergeAll(
  ProductsInMemory.layer,
  ViewportBrowser.layer,
  NotificationsCapacitor.layer,
)
