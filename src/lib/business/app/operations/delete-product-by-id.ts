import { TaggedRequest } from 'effect/Schema'

import { C, RR, Sc } from '$lib/core/imports.ts'

export const DeleteProductByIdDTO = { id: Sc.String }

export type DeleteProductByIdDTO = Sc.Schema.Type<typeof DeleteProductByIdDTO>

export class Request extends TaggedRequest<Request>()(`DeleteProductById`, {
	success: Sc.Void,
	failure: Sc.Void,
	payload: DeleteProductByIdDTO,
}) {}

export class Resolver extends C.Tag(`app/operations/DeleteProductByIdResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
