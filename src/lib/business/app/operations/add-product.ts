import type { RequestResolver } from 'effect/RequestResolver'

import { C, Da, Int, NETS, O, R } from '$lib/core/imports.ts'

export interface ProductDTO {
	readonly name: NETS.NonEmptyTrimmedString
	readonly maybeExpirationDate: O.Option<Int.Integer>
	readonly creationDate: Int.Integer
}

export class OperationFailed extends Da.TaggedError(`OperationFailed`) {}

interface Request extends R.Request<void, OperationFailed>, ProductDTO {
	readonly _tag: `AddProduct`
}

export const Request = R.tagged<Request>(`AddProduct`)

export class Resolver extends C.Tag(`app/operations/AddProductResolver`)<
	Resolver,
	RequestResolver<Request>
>() {}
