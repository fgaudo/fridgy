import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Integer = Brand.Branded<number, `Integer`>

/** @internal **/
export const _Integer = Brand.refined<Integer>(
	n => Number.isInteger(n),
	n => Brand.error(`Expected ${n.toString(10)} to be an integer`),
)

export const Schema = _Schema
	.fromBrand(_Integer)(_Schema.Number)
	.annotations({
		arbitrary: () => fc => fc.integer().map(unsafeFromNumber),
	})

export const fromNumber = (n: number) => _Integer.option(n)
export const unsafeFromNumber = _Integer
export const isInteger = (n: number) => _Integer.is(n)
