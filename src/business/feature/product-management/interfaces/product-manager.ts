import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Req from 'effect/Request'
import { type RequestResolver } from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

interface AddProductRequest extends Req.Request<boolean> {
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

interface DeleteProductByIdRequest extends Req.Request<boolean> {
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

type GetSortedProducts = Iterable<{
	maybeId: Option.Option<string>
	maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
	maybeExpirationDate: Option.Option<Integer.Integer>
	maybeCreationDate: Option.Option<Integer.Integer>
}>

/////
/////

export class Service extends Context.Tag(
	`feature/product-management/interfaces/product-manager`,
)<
	Service,
	{
		addProduct: {
			resolver: RequestResolver<AddProductRequest>
		}

		deleteProductById: {
			resolver: RequestResolver<DeleteProductByIdRequest>
		}

		getSortedProducts: Effect.Effect<GetSortedProducts, void>
	}
>() {}
