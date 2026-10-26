import * as Layer from 'effect/Layer'
import * as AddProductsSql from './services/add-products/add-products.sql.ts'
import * as ScannerBrowser from './services/scanner/scanner.browser.ts'

export const layer = Layer.mergeAll(AddProductsSql.layer, ScannerBrowser.layer)
