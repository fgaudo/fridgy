import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Req from 'effect/Request'
import { type RequestResolver } from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

interface AddProductRequest extends Req.Request<string, void> {
	name: NonEmptyTrimmedString.NonEmptyTrimmedString
	maybeExpirationDate: Option.Option<Integer.Integer>
	creationDate: Integer.Integer
}

export type AddProduct = {
	Request: AddProductRequest
}

export const AddProduct = {
	Request: Req.of<AddProductRequest>(),
}

/////
/////

export interface DeleteProductByIdRequest extends Req.Request<void, void> {
	id: string
}

export type DeleteProductById = {
	Request: DeleteProductByIdRequest
}

export const DeleteProductById = {
	Request: Req.of<DeleteProductByIdRequest>(),
}

/////
/////

export type GetProducts = Option.Option<
	Arr.NonEmptyReadonlyArray<
		Readonly<{
			maybeId: Option.Option<string>
			maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
			maybeExpirationDate: Option.Option<Integer.Integer>
			maybeCreationDate: Option.Option<Integer.Integer>
		}>
	>
>

/////
/////

// @effect-codegens accessors:c93d80bf8e827ab7
export class ProductRepository extends Effect.Tag('9ea1edcf8c731e69')<
	ProductRepository,
	{
		readonly addProductResolver: RequestResolver<AddProductRequest>

		readonly deleteProductByIdResolver: RequestResolver<DeleteProductByIdRequest>

		readonly getProducts: Effect.Effect<GetProducts, void>
	}
>() {}
