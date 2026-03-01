import * as Brand from 'effect/Brand'
import { pipe } from 'effect/Function'
import * as Opt from 'effect/Option'

import * as Integer from '@/core/integer/integer'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string'
import * as UnitInterval from '@/core/unit-interval.ts'

export type Product = Brand.Branded<object, 'Product'>
export type Expirable = Brand.Branded<Product, 'Expirable'>
export type ProductState = {
	name: string
	creationDate: Integer.Integer
	maybeExpirationDate: Opt.Option<Integer.Integer>
}
export type ProductInput = {
	maybeName: Opt.Option<string>
	maybeCreationDate: Opt.Option<Integer.Integer>
	maybeExpirationDate: Opt.Option<Integer.Integer>
}

export const makeProduct = (p: ProductInput): Opt.Option<Product> =>
	Opt.gen(function* () {
		const [name, creationDate] = yield* Opt.all([
			Opt.andThen(p.maybeName, NonEmptyTrimmedString.make),
			Opt.andThen(p.maybeCreationDate, Integer.fromNumber),
		])

		const maybeExpirationDate = Opt.andThen(
			p.maybeExpirationDate,
			Integer.fromNumber,
		)

		if (Opt.isNone(maybeExpirationDate)) {
			return asProduct(
				_Product({
					name,
					creationDate,
					maybeExpirationDate: Opt.none(),
				}),
			)
		}

		if (creationDate > maybeExpirationDate.value) {
			return yield* Opt.none()
		}

		return asProduct(
			_Product({
				name,
				creationDate,
				maybeExpirationDate,
			}),
		)
	})

export const toState = (p: Product): ProductState => {
	const product = asInternalProduct(p)

	return product
}

export function isFresh(currentDate: Integer.Integer) {
	return (expirable: Expirable) => {
		const product = asInternalExpirable(expirable)

		if (product.maybeExpirationDate.value <= currentDate) {
			return { _tag: 'False' } as const
		}

		return {
			_tag: 'True',
			freshness: evaluateFreshness(
				product.maybeExpirationDate.value,
				product.creationDate,
				currentDate,
			),
			timeLeft: evaluateTimeLeft(
				product.maybeExpirationDate.value,
				product.creationDate,
			),
		} as const
	}
}

export function isExpirable(_product: Product): _product is Expirable {
	const product = asInternalProduct(_product)

	if (Opt.isNone(product.maybeExpirationDate)) {
		return false
	}

	return true
}

export const isValid = (p: ProductInput) => Opt.isSome(makeProduct(p))

export const name = (product: Product) => asInternalProduct(product).name

export const creationDate = (product: Product) =>
	asInternalProduct(product).creationDate

export const expirationDate = (product: Expirable) =>
	asInternalExpirable(product).maybeExpirationDate.value

function evaluateFreshness(
	expirationDate: Integer.Integer,
	creationDate: Integer.Integer,
	currentDate: Integer.Integer,
) {
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
}

function evaluateTimeLeft(
	expirationDate: Integer.Integer,
	currentDate: Integer.Integer,
) {
	const timeLeft = expirationDate - currentDate

	return timeLeft <= 0
		? Integer.unsafeFromNumber(0)
		: Integer.unsafeFromNumber(timeLeft)
}

type _Product = Brand.Branded<
	{
		name: NonEmptyTrimmedString.NonEmptyTrimmedString
		creationDate: Integer.Integer
		maybeExpirationDate: Opt.Option<Integer.Integer>
	},
	'Product'
>
const _Product = Brand.nominal<_Product>()

type _Expirable = Brand.Branded<
	_Product & { maybeExpirationDate: Opt.Some<Integer.Integer> },
	'_Expirable'
>

/* eslint-disable @typescript-eslint/consistent-type-assertions */
function asInternalExpirable(product: Expirable) {
	return product as unknown as _Expirable
}
function asInternalProduct(product: Product) {
	return product as unknown as _Product
}
function asProduct(product: _Product) {
	return product as unknown as Product
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */
