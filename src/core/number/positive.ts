import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Positive = Brand.Branded<number, `Positive`>

/** @internal **/
export const _Positive = Brand.refined<Positive>(
	n => n > 0,
	n => Brand.error(`Expected ${n.toString(10)} to be a positive number`),
)

export const Schema = _Schema
	.fromBrand(_Positive)(_Schema.Number)
	.annotations({
		arbitrary: () => fc =>
			fc
				.double()
				.filter(n => n > 0)
				.map(unsafeFromNumber),
	})

export const fromNumber = (number: number) => _Positive.option(number)
export const unsafeFromNumber = _Positive
export const isNonNegative = (number: number) => _Positive.is(number)
