import * as Arr from 'effect/Array'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import { normalizeCode, OpenFoodFacts } from '#infrastructure/open-food-facts/open-food-facts.ts'
import { BarcodeCache, type Row } from '#infrastructure/storage/barcodes.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
import { type FoundProduct, ProductLookup, ProductLookupError } from './product-lookup.ts'

/**
 * How long a product unknown to Open Food Facts is not asked for again: someone may add it meanwhile. A known one
 * is never asked for again.
 */
export const NOT_FOUND_DAYS = 7

// The device's language, the first subtag of its tag (`it-IT` → `it`): the one the product's name is asked in.
const language = Effect.sync(() =>
  (globalThis.navigator?.language ?? Intl.DateTimeFormat().resolvedOptions().locale).split('-')[0]?.toLowerCase()
    ?? 'en'
)

/** The cache's answer: a product, none, or a miss that the network must answer. */
type Cached = Opt.Option<Opt.Option<Omit<FoundProduct, 'url'>>>

/** What a row says, at `now`. A found row whose name is blank, which no version writes, is a miss. */
const cachedOf = (row: Row, now: DateTime.Utc): Cached => {
  if (row.status === 'not_found') {
    return DateTime.isGreaterThan(DateTime.add(row.lookedUpAt, { days: NOT_FOUND_DAYS }), now)
      ? Opt.some(Opt.none())
      : Opt.none()
  }
  return Opt.map(
    Opt.flatMap(row.maybeName, NormalizedString.fromString),
    (name) =>
      Opt.some({
        name,
        maybeBrand: Opt.flatMap(
          row.maybeBrands,
          (brands) => Arr.head(Arr.getSomes(brands.split(',').map(NormalizedString.fromString))),
        ),
        maybeQuantity: Opt.flatMap(row.maybeQuantity, NormalizedString.fromString),
      }),
  )
}

/** The adapter on a client of Open Food Facts that it is given: its tests give it a fake one. */
export const layerOnClient = Layer.effect(
  ProductLookup,
  Effect.gen(function*() {
    const cache = yield* BarcodeCache
    const { fetchProduct, productUrl } = yield* OpenFoodFacts
    const lookup = Effect.fn('ProductLookup')(
      function*(barcode: string) {
        const maybeCode = normalizeCode(barcode)
        if (Opt.isNone(maybeCode)) {
          yield* Effect.logDebug('Not a barcode to look up', barcode)
          return Opt.none()
        }
        const code = maybeCode.value
        const found = (product: Omit<FoundProduct, 'url'>): FoundProduct => ({ ...product, url: productUrl(code) })
        const now = yield* DateTime.now
        const maybeRow = yield* cache.read(code).pipe(
          Effect.tapError((error) => Effect.logWarning('Could not read the cached product', error)),
          Effect.orElseSucceed((): Opt.Option<Row> => Opt.none()),
        )
        const cached = Opt.flatMap(maybeRow, (row) => cachedOf(row, now))
        if (Opt.isSome(cached)) return Opt.map(cached.value, found)
        const lang = yield* language
        const maybeProduct = yield* fetchProduct(code, lang).pipe(
          Effect.mapError((error) => new ProductLookupError({ cause: error.cause })),
        )
        const row: Row = Opt.match(maybeProduct, {
          onNone: () => ({
            barcode: code,
            status: 'not_found',
            maybeName: Opt.none(),
            maybeBrands: Opt.none(),
            maybeQuantity: Opt.none(),
            maybeLanguage: Opt.none(),
            lookedUpAt: now,
          }),
          onSome: (product) => ({
            barcode: code,
            status: 'found',
            maybeName: Opt.some(product.name),
            maybeBrands: Arr.isReadonlyArrayNonEmpty(product.brands) ? Opt.some(product.brands.join(', ')) : Opt.none(),
            maybeQuantity: product.maybeQuantity,
            maybeLanguage: Opt.some(lang),
            lookedUpAt: now,
          }),
        })
        yield* cache.write(row).pipe(
          Effect.catch((error) => Effect.logWarning('Could not cache the product', error)),
        )
        return Opt.map(
          maybeProduct,
          (product) =>
            found({ name: product.name, maybeBrand: Arr.head(product.brands), maybeQuantity: product.maybeQuantity }),
        )
      },
      Effect.withLogSpan('ProductLookup'),
    )
    return { lookup }
  }),
).pipe(Layer.provide(BarcodeCache.layer))

/** Needs the `SqlClient` and the `HttpClient`, which have alternatives: the entrypoints pick them. */
export const layer = layerOnClient.pipe(Layer.provide(OpenFoodFacts.layer))
