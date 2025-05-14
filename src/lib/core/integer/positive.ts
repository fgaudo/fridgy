import { B, Int } from '../imports.ts'
import * as Pos from '../number/positive.ts'
import type { Integer } from './index.ts'

export type PositiveInteger = Integer & Pos.Positive

/** @internal */
export const PositiveInteger = B.all(Int.Integer, Pos.Positive)

export const fromNumber = PositiveInteger.option
export const unsafeFromNumber = PositiveInteger
export const isNonNegative = PositiveInteger.is
