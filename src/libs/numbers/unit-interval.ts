import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type UnitInterval = Brand.Branded<number, 'core.UnitInterval'>

/** @internal **/
export const _UnitInterval = Brand.make<UnitInterval>(n => n >= 0 && n <= 1)

export const Schema = _Schema.fromBrand(
	'core.UnitInterval',
	_UnitInterval,
)(_Schema.Number)

export const UnitIntervalFromSelf = _Schema.declare(
	(input): input is UnitInterval =>
		typeof input === 'number' && _UnitInterval.is(input),
)

export const fromNumber = (n: number) => _UnitInterval.option(n)
export const unsafeFromNumber = _UnitInterval
export const isInteger = (n: number) => _UnitInterval.is(n)
