import {
	B,
	C,
	Eff,
	Int,
	NETS,
	O,
} from '@/core/imports.ts'

export interface AddProductDTO {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
	creationDate: Int.Integer
}

export class AddProductService extends C.Tag(
	'AddProductService',
)<
	AddProductService,
	(
		product: AddProductDTO,
	) => Eff.Effect<void, AddProductServiceError>
>() {}

export type AddProductServiceError = string &
	B.Brand<'AddProductServiceError'>

export const AddProductServiceError =
	B.nominal<AddProductServiceError>()
