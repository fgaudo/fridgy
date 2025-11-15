import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import { type RequestResolver } from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

class AddProductRequest extends Schema.TaggedRequest<AddProductRequest>()(
	`AddProduct`,
	{
		failure: Schema.Void,
		success: Schema.Void,
		payload: {
			name: NonEmptyTrimmedString.Schema,
			maybeExpirationDate: Schema.Option(Integer.Schema),
			creationDate: Integer.Schema,
		},
	},
) {}

export type AddProduct = {
	Request: AddProductRequest
}

export const AddProduct = {
	Request: AddProductRequest,
}

/////
/////

class DeleteProductByIdRequest extends Schema.TaggedRequest<DeleteProductByIdRequest>()(
	`DeleteProductById`,
	{
		success: Schema.Void,
		failure: Schema.Void,
		payload: { id: Schema.String },
	},
) {}

export type DeleteProductById = {
	Request: DeleteProductByIdRequest
}

export const DeleteProductById = {
	Request: DeleteProductByIdRequest,
}

/////
/////

export const GetSortedProducts = {
	DTO: Schema.Array(
		Schema.Struct({
			maybeId: Schema.Option(Schema.String),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
			maybeExpirationDate: Schema.Option(Integer.Schema),
			maybeCreationDate: Schema.Option(Integer.Schema),
		}),
	),
}

export type GetSortedProducts = {
	DTO: Schema.Schema.Type<typeof GetSortedProducts.DTO>
}

/////
/////

class ProductManager extends Context.Tag(
	`feature/product-management/interfaces/product-manager`,
)<
	ProductManager,
	{
		addProduct: {
			resolver: RequestResolver<AddProductRequest>
		}

		deleteProductById: {
			resolver: RequestResolver<DeleteProductByIdRequest>
		}

		getSortedProducts: Effect.Effect<GetSortedProducts[`DTO`], void>
	}
>() {}

export { ProductManager }
