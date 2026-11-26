// The cached answers of Open Food Facts, reached without a service: the lookup's test sets up and checks its cache
// with them, so that no service carries reads or writes that only tests need.
import * as Effect from 'effect/Effect'
import { BarcodeCache, type Row } from './barcodes.ts'

/** The row cached for a normalized `barcode`, as the database holds it. */
export const readRow = (barcode: string) => BarcodeCache.use(({ read }) => read(barcode)).pipe(Effect.orDie)

/** Caches `row` in place of what was cached for its barcode. */
export const writeRow = (row: Row) => BarcodeCache.use(({ write }) => write(row)).pipe(Effect.orDie)
