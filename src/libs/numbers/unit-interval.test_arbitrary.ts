import * as fc from 'fast-check'
import * as UnitInterval from './unit-interval.ts'

export const arbitrary: fc.Arbitrary<UnitInterval.UnitInterval> = fc
  .double({ min: 0, max: 1, noNaN: true })
  .map(UnitInterval.makeUnsafe)
