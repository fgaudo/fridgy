import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type UnitInterval = Brand.Branded<number, `UnitInterval`>

/** @internal */
export const UnitInterval = Brand.refined<UnitInterval>(
	n => n >= 0 && n <= 1,
	n => Brand.error(`Expected ${n.toString(10)} to be in range [0, 1]`),
)

export const Schema = _Schema
	.fromBrand(UnitInterval)(_Schema.Number)
	.annotations({
		arbitrary: () => fc => fc.double({ min: 0, max: 1 }).map(unsafeFromNumber),
	})

export const fromNumber = (n: number) => UnitInterval.option(n)
export const unsafeFromNumber = UnitInterval
export const isInteger = (n: number) => UnitInterval.is(n)
