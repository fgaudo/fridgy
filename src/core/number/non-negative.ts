import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type NonNegative = Brand.Branded<number, `NonNegative`>

/** @internal **/
export const _NonNegative = Brand.refined<NonNegative>(
	n => n >= 0,
	n => Brand.error(`Expected ${n.toString(10)} to be a non-negative number`),
)

export const Schema = _Schema
	.fromBrand(_NonNegative)(_Schema.Number)
	.annotations({
		arbitrary: () => fc =>
			fc
				.double()
				.filter(n => n >= 0)
				.map(unsafeFromNumber),
	})

export const fromNumber = (number: number) => _NonNegative.option(number)
export const unsafeFromNumber = _NonNegative
export const isNonNegative = (number: number) => _NonNegative.is(number)
