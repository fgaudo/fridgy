import { C, Int, NETS, RR, Sc } from '$lib/core/imports.ts'

export const ProductDTO = {
	name: NETS.NonEmptyTrimmedStringSchema,
	maybeExpirationDate: Sc.Option(Int.IntegerSchema),
	creationDate: Int.IntegerSchema,
}

export type ProductDTO = Sc.Schema.Type<typeof ProductDTO>

export class Request extends Sc.TaggedRequest<Request>()(`AddProduct`, {
	failure: Sc.Void,
	success: Sc.Void,
	payload: ProductDTO,
}) {}

export class Resolver extends C.Tag(`app/operations/AddProductResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
