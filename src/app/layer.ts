import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from '#infrastructure/notifications/capacitor.layer.ts'
import * as About from './children/about/layer.ts'
import * as AddProducts from './children/add-products/layer.ts'
import * as Home from './children/home/layer.ts'

// The adapters that every setup shares: the pages' services', and the infrastructure's that have no
// alternative (the toasts). What has alternatives is left to the entrypoint: the `SqlClient` (the database's
// engine) and the platform's `BackButton` (`#infrastructure/back-button/capacitor.layer.ts`,
// `#infrastructure/back-button/browser.layer.ts`).
export const layer = Layer.mergeAll(Home.layer, AddProducts.layer, About.layer, NotificationsCapacitor.layer)
