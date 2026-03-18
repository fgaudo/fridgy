import * as Req from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as ServiceMap from 'effect/ServiceMap'

import type { ProductState } from '../domain/product'

export interface Request extends Req.Request<string, void> {
	id: string
	product: ProductState
}

export const Request = Req.of<Request>()

export class AddProduct extends ServiceMap.Service<
	AddProduct,
	{
		resolver: RequestResolver.RequestResolver<Request>
	}
>()('cf9ce73b753f639e') {}
