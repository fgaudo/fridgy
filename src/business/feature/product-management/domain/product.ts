import * as Brand from 'effect/Brand'
import * as Option from 'effect/Option'
import * as _Schema from 'effect/Schema'

import * as Integer from '@/core/integer/index.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

export type Product = Brand.Branded<
	{
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		maybeExpirationDate: Option.Option<Integer.Integer>
		creationDate: Integer.Integer
	},
	`Product`
>

/** @internal */
export const Product = Brand.refined<Product>(
	() => true,
	() => Brand.error(`Product is invalid`),
)

export const Schema = _Schema.fromBrand(Product)(
	_Schema.Struct({
		name: NonEmptyTrimmedString.Schema,
		maybeExpirationDate: _Schema.Option(Integer.Schema),
		creationDate: Integer.Schema,
	}),
)

export const fromStruct = (...p: Parameters<typeof Product.option>) =>
	Product.option(...p)
