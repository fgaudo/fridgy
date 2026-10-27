import * as Layer from 'effect/Layer'
import * as AddProductsSql from './services/add-products/add-products.sql.ts'
import * as DateOrderSettingSql from './services/date-order-setting/date-order-setting.sql.ts'
import * as ScannerBrowser from './services/scanner/scanner.browser.ts'

export const layer = Layer.mergeAll(AddProductsSql.layer, DateOrderSettingSql.layer, ScannerBrowser.layer)
