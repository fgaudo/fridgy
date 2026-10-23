import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'
import type * as Product from '#domain/product.ts'

/** Answers with the id the product was stored under. */
export interface AddProduct extends Req.Request<string, void> {
  readonly snapshot: Product.Snapshot
}

export const AddProduct = Req.of<AddProduct>()

/** Stores new products; the page sees them through the storage's changes, not through this port. */
export class AddProducts extends Context.Service<
  AddProducts,
  { readonly add: RequestResolver.RequestResolver<AddProduct> }
>()('68c26a9ad26f1936') {}
