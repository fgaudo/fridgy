import * as fc from 'fast-check'
import * as Integer from './integer.ts'

export const arbitrary = (
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER }: {
    readonly min?: number
    readonly max?: number
  } = {},
): fc.Arbitrary<Integer.Integer> => fc.integer({ min, max }).map(Integer.fromNumberUnsafe)
