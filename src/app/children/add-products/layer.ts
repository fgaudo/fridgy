import * as Layer from 'effect/Layer'
import * as AddProductsSql from './services/add-products/add-products.sql.ts'
import * as DateOrderSettingSql from './services/date-order-setting/date-order-setting.sql.ts'
import * as ProductLookupOpenFoodFacts from './services/product-lookup/product-lookup.open-food-facts.ts'
import * as ScannerUnavailable from './services/scanner/scanner.unavailable.ts'

export const layer = Layer.mergeAll(
  AddProductsSql.layer,
  DateOrderSettingSql.layer,
  ProductLookupOpenFoodFacts.layer,
  ScannerUnavailable.layer,
)
