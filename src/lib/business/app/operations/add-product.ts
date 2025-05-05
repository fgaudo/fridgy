import { Data } from 'effect'
import type { RequestResolver } from 'effect/RequestResolver'

import {
	C,
	Int,
	NETS,
	O,
	R,
} from '$lib/core/imports.ts'

export interface ProductDTO {
	readonly maybeName: O.Option<NETS.NonEmptyTrimmedString>
	readonly maybeExpirationDate: O.Option<Int.Integer>
	readonly maybeCreationDate: O.Option<Int.Integer>
}

export class OperationFailed extends Data.TaggedError(
	'OperationFailed',
) {}

interface Request
	extends R.Request<void, OperationFailed> {
	readonly _tag: 'AddProduct'
	readonly product: ProductDTO
}

export const Request =
	R.tagged<Request>('AddProduct')

export class Resolver extends C.Tag(
	'app/operations/AddProductResolver',
)<Resolver, RequestResolver<Request>>() {}
