import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'
import type * as Product from '#app/domain/product.ts'

export interface AddProduct extends Req.Request<string, void> {
  readonly snapshot: Product.Snapshot
}

export const AddProduct = Req.of<AddProduct>()

export interface DeleteProductById extends Req.Request<void, void> {
  readonly id: string
}

export const DeleteProductById = Req.of<DeleteProductById>()

/** Changes to the stored products (write side); each page reads them through its own query ports. */
export class ProductCommands extends Context.Service<
  ProductCommands,
  {
    readonly add: RequestResolver.RequestResolver<AddProduct>
    readonly deleteById: RequestResolver.RequestResolver<DeleteProductById>
  }
>()('fd048303d54ddd74') {}
