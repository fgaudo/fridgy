import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

export interface Request extends Req.Request<void, void> {
  id: string
}

export const Request = Req.of<Request>()

export class DeleteProductById extends Context.Service<
  DeleteProductById,
  { resolver: RequestResolver.RequestResolver<Request> }
>()('b9dfc97b97bd9cc5') {}
