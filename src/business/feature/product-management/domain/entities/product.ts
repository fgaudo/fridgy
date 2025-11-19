import * as Brand from 'effect/Brand'
import * as Effect from 'effect/Effect'
import type * as Option from 'effect/Option'
import * as _Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
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
		creationDate: Integer.Schema,
		maybeExpirationDate: _Schema.Option(Integer.Schema),
		name: NonEmptyTrimmedString.Schema,
	}),
)

export class Service extends Effect.Service<Service>()(
	`feature/product-management/domain/product`,
	{
		succeed: {
			makeProduct: (p: {
				name: NonEmptyTrimmedString.NonEmptyTrimmedString
				maybeExpirationDate: Option.Option<Integer.Integer>
				creationDate: Integer.Integer
			}) =>
				Product.option({
					creationDate: p.creationDate,
					maybeExpirationDate: p.maybeExpirationDate,
					name: p.name,
				}),
		},
	},
) {}
