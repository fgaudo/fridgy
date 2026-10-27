import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'
import type * as Product from '#domain/product.ts'

export interface DeleteProductById extends Req.Request<void, void> {
  readonly id: string
}

export const DeleteProductById = Req.of<DeleteProductById>()

/** Stores a deleted product again, under a new id. */
export interface RestoreProduct extends Req.Request<void, void> {
  readonly snapshot: Product.Snapshot
}

export const RestoreProduct = Req.of<RestoreProduct>()

/** Removes stored products, and puts them back when the user undoes it; the list sees both through the storage's changes. */
export class DeleteProducts extends Context.Service<
  DeleteProducts,
  {
    readonly deleteById: RequestResolver.RequestResolver<DeleteProductById>
    readonly restore: RequestResolver.RequestResolver<RestoreProduct>
  }
>()('1da625ee77417fa1') {}
