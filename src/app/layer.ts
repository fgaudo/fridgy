import * as Layer from 'effect/Layer'
import * as NotificationsCapacitor from '#infrastructure/notifications/notifications.capacitor.ts'
import * as About from './children/about/layer.ts'
import * as AddProducts from './children/add-products/layer.ts'
import * as Home from './children/home/layer.ts'

// The adapters that every setup shares: the pages' services', and the infrastructure's that have no
// alternative (the toasts). What has alternatives is left to the entrypoint: the `SqlClient` (the database's
// engine) and the platform's `BackButton` (`#infrastructure/back-button/back-button.capacitor.ts`,
// `#infrastructure/back-button/back-button.browser.ts`).
export const layer = Layer.mergeAll(Home.layer, AddProducts.layer, About.layer, NotificationsCapacitor.layer)
