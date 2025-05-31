import { C, Int, NETS, RR, Sc } from '$lib/core/imports.ts'

export class Request extends Sc.TaggedRequest<Request>()(`AddProduct`, {
	failure: Sc.Void,
	success: Sc.Void,
	payload: {
		name: NETS.NonEmptyTrimmedStringSchema,
		maybeExpirationDate: Sc.Option(Int.IntegerSchema),
		creationDate: Int.IntegerSchema,
	},
}) {}

export class Resolver extends C.Tag(`app/operations/AddProductResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
