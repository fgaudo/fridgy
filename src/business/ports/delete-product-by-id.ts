import * as Req from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as ServiceMap from 'effect/ServiceMap'

export interface Request extends Req.Request<void, void> {
	id: string
}
export const Request = Req.of<Request>()

export class DeleteProductById extends ServiceMap.Service<
	DeleteProductById,
	{
		resolver: RequestResolver.RequestResolver<Request>
	}
>()('dd346eaa1f807826') {}
