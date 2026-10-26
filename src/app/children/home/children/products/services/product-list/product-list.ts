import * as Context from 'effect/Context'
import type * as Opt from 'effect/Option'
import type * as Result from 'effect/Result'
import type { Source } from '#libs/source/source.ts'
import type * as Product from '#domain/product.ts'

/** A stored product, still unvalidated: storage may contain anything. */
export type StoredProduct = Product.UnvalidatedSnapshot & {
  maybeId: Opt.Option<string>
}

export type StoredProducts = Result.Result<ReadonlyArray<StoredProduct>, void>

/** The stored products, ordered by expiration. */
export class ProductList extends Context.Service<
  ProductList,
  {
    /** Event: emits the list on subscription and after every change to the stored products. */
    readonly changes: Source<StoredProducts, never>
  }
>()('2b1f0bcf34c1533c') {}
