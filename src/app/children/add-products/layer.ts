import * as Layer from 'effect/Layer'
import * as Expiration from '#app/programs/expiration/layer.ts'
import * as AddProductsSql from './services/add-products/add-products.sql.ts'
import * as ProductLookupOpenFoodFacts from './services/product-lookup/product-lookup.open-food-facts.ts'
import * as ScannerReactNative from './services/scanner/scanner.react-native.ts'

export const layer = Layer.mergeAll(
  Expiration.layer,
  AddProductsSql.layer,
  ProductLookupOpenFoodFacts.layer,
  ScannerReactNative.layer,
)
