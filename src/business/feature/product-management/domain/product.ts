import * as Brand from 'effect/Brand'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as _Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'
import * as UnitInterval from '@/core/unit-interval.ts'

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

export class ProductService extends Effect.Service<ProductService>()(
	`feature/product-management/domain/product`,
	{
		succeed: {
			makeProduct: (p: {
				name: NonEmptyTrimmedString.NonEmptyTrimmedString
				maybeExpirationDate: Option.Option<Integer.Integer>
				creationDate: Integer.Integer
			}) =>
				Product.option({
					name: p.name,
					maybeExpirationDate: p.maybeExpirationDate,
					creationDate: p.creationDate,
				}),

			hasExpirationDate: (
				product: Product,
			): product is Product & {
				maybeExpirationDate: Option.Some<Integer.Integer>
			} => {
				return Option.isSome(product.maybeExpirationDate)
			},

			isStale: (
				{
					maybeExpirationDate,
				}: Product & { maybeExpirationDate: Option.Some<Integer.Integer> },
				currentDate: Integer.Integer,
			) => maybeExpirationDate.value <= currentDate,

			computeFreshness: (
				{
					maybeExpirationDate,
					creationDate,
				}: Product & { maybeExpirationDate: Option.Some<Integer.Integer> },
				currentDate: Integer.Integer,
			): UnitInterval.UnitInterval => {
				const expirationDate = maybeExpirationDate.value

				if (expirationDate <= currentDate) {
					return UnitInterval.unsafeFromNumber(0)
				}

				if (expirationDate <= creationDate) {
					return UnitInterval.unsafeFromNumber(0)
				}

				if (currentDate < creationDate) {
					return UnitInterval.unsafeFromNumber(1)
				}

				const remainingDuration = expirationDate - currentDate
				const totalDuration = expirationDate - creationDate

				return UnitInterval.unsafeFromNumber(remainingDuration / totalDuration)
			},

			timeLeft: (
				product: Product & {
					maybeExpirationDate: Option.Some<Integer.Integer>
				},
				currentDate: Integer.Integer,
			): Integer.Integer => {
				const timeLeft = product.maybeExpirationDate.value - currentDate

				return timeLeft <= 0
					? Integer.unsafeFromNumber(0)
					: Integer.unsafeFromNumber(timeLeft)
			},
		},
	},
) {}
