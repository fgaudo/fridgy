import type { RequestResolver } from 'effect/RequestResolver'

import { C, Da, Int, NETS, R, Sc } from '$lib/core/imports.ts'

export const ProductDTO = Sc.Struct({
	name: NETS.NonEmptyTrimmedStringSchema,
	maybeExpirationDate: Sc.Option(Int.IntegerSchema),
	creationDate: Int.IntegerSchema,
})

export type ProductDTO = Sc.Schema.Type<typeof ProductDTO>

export class OperationFailed extends Da.TaggedError(`OperationFailed`) {}

interface Request extends R.Request<void, OperationFailed>, ProductDTO {
	readonly _tag: `AddProduct`
}

export const Request = R.tagged<Request>(`AddProduct`)

export class Resolver extends C.Tag(`app/operations/AddProductResolver`)<
	Resolver,
	RequestResolver<Request>
>() {}
