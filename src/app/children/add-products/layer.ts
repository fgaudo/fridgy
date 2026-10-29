import * as Layer from 'effect/Layer'
import * as AddProductsSql from './services/add-products/add-products.sql.ts'
import * as DateOrderSettingSql from './services/date-order-setting/date-order-setting.sql.ts'
import * as ProductLookupOpenFoodFacts from './services/product-lookup/product-lookup.open-food-facts.ts'
import * as ScannerReactNative from './services/scanner/scanner.react-native.ts'

export const layer = Layer.mergeAll(
  AddProductsSql.layer,
  DateOrderSettingSql.layer,
  ProductLookupOpenFoodFacts.layer,
  ScannerReactNative.layer,
)
