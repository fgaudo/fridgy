import { C, Da, Eff, Int, NETS, Sc } from '$lib/core/imports.ts'

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

export class Tag extends C.Tag(`app/operations/GetSortedProducts`)<
	Tag,
	Eff.Effect<GetSortedProductsDTO, FetchingFailed | InvalidDataReceived>
>() {}
