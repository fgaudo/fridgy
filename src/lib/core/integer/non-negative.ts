import { B, Int } from '../imports.ts'
import * as NNN from '../number/non-negative.ts'
import type { Integer } from './index.ts'

export type NonNegativeInteger = Integer & NNN.NonNegative

/** @internal */
export const NonNegativeInteger = B.all(Int.Integer, NNN.NonNegative)

export const fromNumber = (number: number) => NonNegativeInteger.option(number)
export const unsafeFromNumber = NonNegativeInteger
export const isNonNegative = (number: number) => NonNegativeInteger.is(number)
