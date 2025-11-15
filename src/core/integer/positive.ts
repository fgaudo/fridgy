import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

import * as Positive from '../number/positive.ts'
import * as Integer from './integer.ts'

export type PositiveInteger = Integer.Integer & Positive.Positive

/** @internal */
export const PositiveInteger = Brand.all(Integer._Integer, Positive._Positive)

export const Schema = _Schema
	.fromBrand(PositiveInteger)(_Schema.Number)
	.annotations({
		arbitrary: () => fc =>
			fc
				.integer()
				.filter(n => n > 0)
				.map(unsafeFromNumber),
	})

export const fromNumber = (number: number) => PositiveInteger.option(number)
export const unsafeFromNumber = PositiveInteger
export const isNonNegative = (number: number) => PositiveInteger.is(number)
