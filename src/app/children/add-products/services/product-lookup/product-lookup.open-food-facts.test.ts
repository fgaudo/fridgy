import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import {
  normalizeCode,
  OpenFoodFacts,
  OpenFoodFactsError,
  type Product,
} from '#infrastructure/open-food-facts/open-food-facts.ts'
import { readRow, writeRow } from '#infrastructure/storage/barcodes.test_support.ts'
import { BarcodeCache } from '#infrastructure/storage/barcodes.ts'
import * as SqliteMemory from '#infrastructure/storage/sqlite.memory.ts'
import * as NormalizedString from '#libs/strings/normalized-string.ts'
import * as ProductLookupOpenFoodFacts from './product-lookup.open-food-facts.ts'
import { productLookupContract, type Server } from './product-lookup.test_contract.ts'

// The contract's texts are normalized already.
const normalized = (text: string) => Opt.getOrThrow(NormalizedString.fromString(text))

/** The client of Open Food Facts, on the contract's server. */
const client = (server: Server) =>
  Layer.succeed(OpenFoodFacts, {
    fetchProduct: (code) =>
      Effect.flatMap(server.answer(code), (answer) =>
        answer._tag === 'Unreachable'
          ? Effect.fail(new OpenFoodFactsError({ cause: new Error('Unreachable') }))
          : Effect.succeed(
            answer._tag === 'Unknown'
              ? Opt.none()
              : Opt.some<Product>({
                name: normalized(answer.name),
                brands: answer.brands.map(normalized),
                maybeQuantity: Opt.map(answer.maybeQuantity, normalized),
              }),
          )),
    productUrl: server.productUrl,
  })

/** The row of `barcode`'s code; none for a barcode that is not one. */
const rowOf = (barcode: string) =>
  Opt.match(normalizeCode(barcode), {
    onNone: () => Effect.succeedNone,
    onSome: readRow,
  })

productLookupContract(
  'Open Food Facts',
  (server) =>
    ProductLookupOpenFoodFacts.layerOnClient.pipe(
      Layer.provide(client(server)),
      Layer.provideMerge(BarcodeCache.layer),
      Layer.provideMerge(SqliteMemory.layer),
    ),
  {
    isCached: (barcode) => Effect.map(rowOf(barcode), Opt.isSome),
    cacheBlankName: Effect.fnUntraced(function*(barcode) {
      yield* writeRow({
        barcode: Opt.getOrThrow(normalizeCode(barcode)),
        status: 'found',
        maybeName: Opt.some(' '),
        maybeBrands: Opt.none(),
        maybeQuantity: Opt.none(),
        maybeLanguage: Opt.some('en'),
        lookedUpAt: yield* DateTime.now,
      })
    }),
  },
)
