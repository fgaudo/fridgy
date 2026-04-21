import * as Context from 'effect/Context'
import * as Req from 'effect/Request'
import type * as RequestResolver from 'effect/RequestResolver'

import type { ProductOutput } from '@/domain/product.ts'

export interface Request extends Req.Request<string, void> {
	id: string
	product: ProductOutput
}

export const Request = Req.of<Request>()

export class AddProduct extends Context.Service<
	AddProduct,
	RequestResolver.RequestResolver<Request>
>()('73455ef18d17eea9') {}
