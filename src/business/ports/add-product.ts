import * as Req from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as ServiceMap from 'effect/ServiceMap'

import type { ProductOutput } from '@/business/domain/product'

export interface Request extends Req.Request<string, void> {
	id: string
	product: ProductOutput
}

export const Request = Req.of<Request>()

export class AddProduct extends ServiceMap.Service<
	AddProduct,
	RequestResolver.RequestResolver<Request>
>()('cf9ce73b753f639e') {}
