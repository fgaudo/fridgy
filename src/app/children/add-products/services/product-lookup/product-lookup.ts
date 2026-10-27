import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

/** The answer could not be had: the name stays as it was. */
export class ProductLookupError extends Data.TaggedError('ProductLookupError')<{
  readonly cause: unknown
}> {}

/** What Open Food Facts knows of a product, as the page needs it. */
export type FoundProduct = Readonly<{
  /** The product's name, in the device's language when Open Food Facts has it, never blank. */
  name: string
  /** The first of its brands, never blank. */
  maybeBrand: Opt.Option<string>
  /** Its quantity as written on the package, never blank. */
  maybeQuantity: Opt.Option<string>
  /** The product's page, for the attribution the licence asks for. */
  url: string
}>

/** Names a scanned product. */
export class ProductLookup extends Context.Service<
  ProductLookup,
  {
    /**
     * The product sold under `barcode`, if Open Food Facts knows it: `None` when it does not, or knows it without a
     * name. Fails when the answer cannot be had: no network, a timeout, a server error, an answer that is not one.
     * Answers from the cache when it can: only a miss reaches the network.
     */
    readonly lookup: (barcode: string) => Effect.Effect<Opt.Option<FoundProduct>, ProductLookupError>
  }
>()('91fa9890c15a396d') {}
