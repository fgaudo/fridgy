import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Integer = Brand.Branded<number, `Integer`>

/** @internal */
export const Integer = Brand.refined<Integer>(
	n => Number.isInteger(n),
	n => Brand.error(`Expected ${n.toString(10)} to be an integer`),
)

export const Schema = _Schema
	.fromBrand(Integer)(_Schema.Number)
	.annotations({
		arbitrary: () => fc => fc.integer().map(unsafeFromNumber),
	})

export const fromNumber = (n: number) => Integer.option(n)
export const unsafeFromNumber = Integer
export const isInteger = (n: number) => Integer.is(n)
