import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

import * as Integer from './integer.ts'

export type PositiveInteger = Brand.Branded<
	Integer.Integer,
	'core.PositiveInteger'
>

const PositiveInteger = Brand.all(
	Integer._internal.Integer,
	Brand.make<PositiveInteger>(n => n > 0),
)

export const fromNumber = (number: number) => PositiveInteger.option(number)
export const fromNumberUnsafe = PositiveInteger
export const isNonNegative = (number: number) => PositiveInteger.is(number)

/** @internal */
export const _internal = {
	PositiveInteger,
}
