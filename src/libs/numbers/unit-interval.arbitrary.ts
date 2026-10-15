import * as fc from 'fast-check'
import * as UnitInterval from './unit-interval.ts'

/** Generates `UnitInterval`s: any number in [0, 1], bounds included. */
export const arbitrary: fc.Arbitrary<UnitInterval.UnitInterval> = fc
  .double({ min: 0, max: 1, noNaN: true })
  .map(UnitInterval.unsafeFromNumber)
