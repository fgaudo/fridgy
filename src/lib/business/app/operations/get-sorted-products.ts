import type { RequestResolver } from 'effect/RequestResolver'

import {
	C,
	Da,
	Int,
	NETS,
	NNInt,
	O,
	R,
} from '$lib/core/imports.ts'

export type ProductDTO = {
	readonly maybeId: O.Option<string>
	readonly maybeName: O.Option<NETS.NonEmptyTrimmedString>
	readonly maybeExpirationDate: O.Option<Int.Integer>
	readonly maybeCreationDate: O.Option<Int.Integer>
}

export class FetchingFailed extends Da.TaggedError(
	'FetchingFailed',
) {}

export class InvalidDataReceived extends Da.TaggedError(
	'InvalidDataReceived',
) {}

interface Request
	extends R.Request<
		{
			total: NNInt.NonNegativeInteger
			products: ProductDTO[]
		},
		InvalidDataReceived | FetchingFailed
	> {
	readonly _tag: 'GetSortedProducts'
}

export const Request = R.tagged<Request>(
	'GetSortedProducts',
)

export class Resolver extends C.Tag(
	'app/operations/GetSortedProductsResolver',
)<Resolver, RequestResolver<Request>>() {}
