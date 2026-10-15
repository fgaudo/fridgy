import * as fc from 'fast-check'
import * as PositiveInteger from './positive-integer.ts'

/** Generates `PositiveInteger`s between `min` (at least 1) and `max` (inclusive). */
export const arbitrary = (
  { min = 1, max = Number.MAX_SAFE_INTEGER }: {
    readonly min?: number
    readonly max?: number
  } = {},
): fc.Arbitrary<PositiveInteger.PositiveInteger> =>
  fc.integer({ min: Math.max(min, 1), max }).map(PositiveInteger.fromNumberUnsafe)
