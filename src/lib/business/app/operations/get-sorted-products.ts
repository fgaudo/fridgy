import { C, Da, Int, NETS, R, RR, Sc } from '$lib/core/imports.ts'

export const ProductDTO = Sc.Struct({
	maybeId: Sc.Option(Sc.String),
	maybeName: Sc.Option(NETS.NonEmptyTrimmedStringSchema),
	maybeExpirationDate: Sc.Option(Int.IntegerSchema),
	maybeCreationDate: Sc.Option(Int.IntegerSchema),
})
export type ProductDTO = Sc.Schema.Type<typeof ProductDTO>

export const GetSortedProductsDTO = Sc.Array(ProductDTO)

export type GetSortedProductsDTO = Sc.Schema.Type<typeof GetSortedProductsDTO>

export class FetchingFailed extends Da.TaggedError(`FetchingFailed`) {}

export class InvalidDataReceived extends Da.TaggedError(
	`InvalidDataReceived`,
) {}

interface Request
	extends R.Request<
		GetSortedProductsDTO,
		InvalidDataReceived | FetchingFailed
	> {
	readonly _tag: `GetSortedProducts`
}

export const Request = R.tagged<Request>(`GetSortedProducts`)

export class Resolver extends C.Tag(`app/operations/GetSortedProductsResolver`)<
	Resolver,
	RR.RequestResolver<Request>
>() {}
