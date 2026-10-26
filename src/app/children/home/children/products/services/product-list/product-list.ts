import * as Context from 'effect/Context'
import * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type * as Product from '#domain/product.ts'
import type { Source } from '#libs/source/source.ts'

/** A stored product, still unvalidated: storage may contain anything. */
export type StoredProduct = Product.UnvalidatedSnapshot & {
  maybeId: Opt.Option<string>
}

/** The storage could not be read: the list stays as it was until the next change. */
export class ProductListReadError extends Data.TaggedError('ProductListReadError')<{
  readonly cause: unknown
}> {}

export type StoredProducts = Result.Result<ReadonlyArray<StoredProduct>, ProductListReadError>

/** The stored products, ordered by expiration. */
export class ProductList extends Context.Service<
  ProductList,
  {
    /**
     * Event: emits the list on subscription and after every change to the stored products, or why it could not
     * be read; it never ends, a failed read included.
     */
    readonly changes: Source<StoredProducts, never>
  }
>()('2b1f0bcf34c1533c') {}
