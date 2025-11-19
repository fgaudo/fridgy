import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type { RequestResolver } from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'

class AddProductRequest extends Schema.TaggedRequest<AddProductRequest>()(
	`AddProduct`,
	{
		failure: Schema.Never,
		payload: {
			creationDate: Integer.Schema,
			maybeExpirationDate: Schema.Option(Integer.Schema),
			name: NonEmptyTrimmedString.Schema,
		},
		success: Schema.Boolean,
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
		failure: Schema.Never,
		payload: { id: Schema.String },
		success: Schema.Boolean,
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
			maybeCreationDate: Schema.Option(Integer.Schema),
			maybeExpirationDate: Schema.Option(Integer.Schema),
			maybeId: Schema.Option(Schema.String),
			maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
		}),
	),
}

export type GetSortedProducts = {
	DTO: Schema.Schema.Type<typeof GetSortedProducts.DTO>
}

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

		getSortedProducts: Effect.Effect<GetSortedProducts[`DTO`], void>
	}
>() {}
