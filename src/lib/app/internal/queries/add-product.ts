import {
	C,
	Eff,
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts';

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString;
	maybeExpirationDate?: O.Option<Int.Integer>;
	creationDate: Int.Integer;
}

export class Tag extends C.Tag(
	'AddProductService',
)<
	Tag,
	(product: ProductDTO) => Eff.Effect<void, void>
>() {}
