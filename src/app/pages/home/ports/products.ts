import * as Context from 'effect/Context'
import type * as Opt from 'effect/Option'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'
import type * as Result from 'effect/Result'
import type * as Stream from 'effect/Stream'
import type { ProductInput, ProductOutput } from '../domain/product.ts'

/** A stored product, still unvalidated: storage may contain anything. */
export type StoredProduct = ProductInput & {
  maybeId: Opt.Option<string>
}

/** The whole product list, or a failure to read it. */
export type Snapshot = Result.Result<ReadonlyArray<StoredProduct>, void>

/** Command: stores a product and succeeds with its id. */
export interface AddProduct extends Req.Request<string, void> {
  readonly product: ProductOutput
}

export const AddProduct = Req.of<AddProduct>()

/** Command: deletes the product with the given id. */
export interface DeleteProductById extends Req.Request<void, void> {
  readonly id: string
}

export const DeleteProductById = Req.of<DeleteProductById>()

/** Product storage: its commands and its events. */
export class Products extends Context.Service<
  Products,
  {
    readonly add: RequestResolver.RequestResolver<AddProduct>
    readonly deleteById: RequestResolver.RequestResolver<DeleteProductById>
    /** Event: emits a snapshot on subscription and after every change. */
    readonly changes: Stream.Stream<Snapshot>
  }
>()('4e9f0b9063e5249a') {}
