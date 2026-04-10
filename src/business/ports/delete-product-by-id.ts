import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'

export interface Request extends Req.Request<void, void> {
	id: string
}
export const Request = Req.of<Request>()

export class DeleteProductById extends Context.Service<
	DeleteProductById,
	RequestResolver.RequestResolver<Request>
>()('393c244b7d938eca') {}
