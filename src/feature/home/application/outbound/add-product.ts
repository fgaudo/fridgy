import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'

import type { ProductOutput } from '../../domain/product.ts'

export interface Request extends Req.Request<string, void> {
  id: string
  product: ProductOutput
}

export const Request = Req.of<Request>()

export class AddProduct extends Context.Service<
  AddProduct,
  { resolver: RequestResolver.RequestResolver<Request> }
>()('5ee89fc68d859661') {}
