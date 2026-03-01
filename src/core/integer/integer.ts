import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Integer = Brand.Branded<number, 'core.Integer'>

/** @internal **/
export const _Integer = Brand.make<Integer>(n => Number.isInteger(n))

export const Schema = _Schema.fromBrand(
	'core.Integer',
	_Integer,
)(_Schema.Number)

export const IntegerFromSelf = _Schema.declare(
	(input): input is Integer => typeof input === 'number' && _Integer.is(input),
)

export const fromNumber = (n: number) => _Integer.option(n)
export const unsafeFromNumber = _Integer
export const isInteger = (n: number) => _Integer.is(n)
