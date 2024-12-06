import {
	C,
	Eff,
	Int,
	NETS,
	O,
} from '@/core/imports.ts'

export interface ProductDTO {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
	creationDate: Int.Integer
}

export class AddProductService extends C.Tag(
	'AddProductService',
)<
	AddProductService,
	(product: ProductDTO) => Eff.Effect<void, void>
>() {}
