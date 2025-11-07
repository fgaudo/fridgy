import * as Brand from 'effect/Brand'

import * as NonNegative from '../number/non-negative.ts'
import * as Integer from './index.ts'

export type NonNegativeInteger = Integer.Integer & NonNegative.NonNegative

/** @internal */
export const NonNegativeInteger = Brand.all(
	Integer.Integer,
	NonNegative.NonNegative,
)

export const fromNumber = (number: number) => NonNegativeInteger.option(number)
export const unsafeFromNumber = NonNegativeInteger
export const isNonNegative = (number: number) => NonNegativeInteger.is(number)
