import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'

export interface DeleteProductById extends Req.Request<void, void> {
  readonly id: string
}

export const DeleteProductById = Req.of<DeleteProductById>()

/** Removes stored products; the list sees them leave through the storage's changes. */
export class DeleteProducts extends Context.Service<
  DeleteProducts,
  { readonly deleteById: RequestResolver.RequestResolver<DeleteProductById> }
>()('1da625ee77417fa1') {}
