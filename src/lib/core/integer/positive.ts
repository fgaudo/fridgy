import * as Brand from 'effect/Brand'

import * as Positive from '../number/positive.ts'
import * as Integer from './index.ts'

export type PositiveInteger = Integer.Integer & Positive.Positive

/** @internal */
export const PositiveInteger = Brand.all(Integer.Integer, Positive.Positive)

export const fromNumber = (number: number) => PositiveInteger.option(number)
export const unsafeFromNumber = PositiveInteger
export const isNonNegative = (number: number) => PositiveInteger.is(number)
