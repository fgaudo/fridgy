import { Data } from 'effect'

import {
	C,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts'

export interface ProductDTO {
	maybeName: O.Option<NETS.NonEmptyTrimmedString>
	maybeExpirationDate: O.Option<Int.Integer>
	maybeCreationDate: O.Option<Int.Integer>
}

export class OperationFailed extends Data.TaggedError(
	'OperationFailed',
) {}

export class AddProduct extends C.Tag(
	'data/AddProduct',
)<
	AddProduct,
	(
		product: ProductDTO,
	) => Eff.Effect<void, OperationFailed>
>() {}
