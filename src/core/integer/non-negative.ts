import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

import * as NonNegative from '../number/non-negative.ts'
import * as Integer from './integer.ts'

export type NonNegativeInteger = Integer.Integer & NonNegative.NonNegative

/** @internal */
export const NonNegativeInteger = Brand.all(
	Integer._Integer,
	NonNegative._NonNegative,
)

export const Schema = _Schema
	.fromBrand(NonNegativeInteger)(_Schema.Number)
	.annotations({
		arbitrary: () => fc =>
			fc
				.integer()
				.filter(n => n >= 0)
				.map(unsafeFromNumber),
	})

export const fromNumber = (number: number) => NonNegativeInteger.option(number)
export const unsafeFromNumber = NonNegativeInteger
export const isNonNegative = (number: number) => NonNegativeInteger.is(number)
