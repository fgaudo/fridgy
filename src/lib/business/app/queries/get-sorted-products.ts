import { Context, Data } from 'effect'

import {
	Eff,
	Int,
	NETS,
	NNInt,
	O,
} from '$lib/core/imports.ts'

export type ProductDTO = {
	maybeId: O.Option<string>
	maybeName: O.Option<NETS.NonEmptyTrimmedString>
	maybeExpirationDate: O.Option<Int.Integer>
	maybeCreationDate: O.Option<Int.Integer>
}

export class FetchingFailed extends Data.TaggedError(
	'FetchingFailed',
) {}

export class InvalidDataReceived extends Data.TaggedError(
	'InvalidDataReceived',
) {}

export class GetSortedProducts extends Context.Tag(
	'data/GetSortedProducts',
)<
	GetSortedProducts,
	Eff.Effect<
		{
			total: NNInt.NonNegativeInteger
			products: ProductDTO[]
		},
		FetchingFailed | InvalidDataReceived
	>
>() {}
