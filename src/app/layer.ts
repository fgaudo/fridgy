import * as Layer from 'effect/Layer'
import * as HapticsReactNative from '#infrastructure/haptics/haptics.react-native.ts'
import * as About from './children/about/layer.ts'
import * as AddProducts from './children/add-products/layer.ts'
import * as EditProduct from './children/edit-product/layer.ts'
import * as Home from './children/home/layer.ts'

// The adapters that every setup shares: the pages' services', and the infrastructure's that have no
// alternative (the vibrations). What has alternatives is left to the entrypoint: the `SqlClient` (the
// database's engine), the `HttpClient`, the platform's `BackButton` and `Keyboard`
// (`#infrastructure/back-button/back-button.react-native.ts`, or a test's) and the zone the days are counted in,
// `DateTime.CurrentTimeZone`: the device's, or a test's.
export const layer = Layer.mergeAll(
  Home.layer,
  AddProducts.layer,
  EditProduct.layer,
  About.layer,
  HapticsReactNative.layer,
)
