import * as Layer from 'effect/Layer'
import { DateOrderStore } from '#infrastructure/storage/date-order.ts'
import { ProductStore } from '#infrastructure/storage/products.ts'

// The infrastructure's services that have no alternative: the stores. What has alternatives is left to the
// entrypoint, or to a test: the `SqlClient` (the database's engine, under the stores), the platform's `BackButton`,
// `BarcodeCamera`, `Haptics`, `Keyboard` and `Links`, the `ProductLookup` (on Open Food Facts, through the
// `HttpClient`) and the zone the days are counted in, `DateTime.CurrentTimeZone`.
export const layer = Layer.mergeAll(ProductStore.layer, DateOrderStore.layer)
