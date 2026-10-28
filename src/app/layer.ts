import * as Layer from 'effect/Layer'
import * as HapticsCapacitor from '#infrastructure/haptics/haptics.capacitor.ts'
import * as About from './children/about/layer.ts'
import * as AddProducts from './children/add-products/layer.ts'
import * as EditProduct from './children/edit-product/layer.ts'
import * as Home from './children/home/layer.ts'

// The adapters that every setup shares: the pages' services', and the infrastructure's that have no
// alternative (the vibrations). What has alternatives is left to the entrypoint: the `SqlClient` (the
// database's engine), the `HttpClient` and the platform's `BackButton`
// (`#infrastructure/back-button/back-button.capacitor.ts`, `#infrastructure/back-button/back-button.browser.ts`).
export const layer = Layer.mergeAll(
  Home.layer,
  AddProducts.layer,
  EditProduct.layer,
  About.layer,
  HapticsCapacitor.layer,
)
