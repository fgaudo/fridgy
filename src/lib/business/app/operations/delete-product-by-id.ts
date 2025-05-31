import { C, RR, Sc } from '$lib/core/imports.ts'

export class Request extends Sc.TaggedRequest<Request>()(`DeleteProductById`, {
	success: Sc.Void,
	failure: Sc.Void,
	payload: { id: Sc.String },
}) {}

export class Resolver extends C.Tag(`app/operations/DeleteProductByIdResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
