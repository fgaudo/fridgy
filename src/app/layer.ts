import * as Layer from 'effect/Layer'
import * as About from './pages/about/layer.ts'
import * as AddProducts from './pages/add-products/layer.ts'
import * as Home from './pages/home/layer.ts'

// The adapters that every setup shares. What has alternatives is left to the entrypoint: the `SqlClient` (the
// database's engine) and the `Shell` (`services/shell/shell.capacitor.ts`, `services/shell/shell.browser.ts`).
export const layer = Layer.mergeAll(Home.layer, AddProducts.layer, About.layer)
