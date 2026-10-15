import * as Brand from 'effect/Brand'

/** A number in [0, 1], bounds included. */
export type UnitInterval = Brand.Branded<number, 'core.UnitInterval'>

const UnitInterval = Brand.make<UnitInterval>((n) => n >= 0 && n <= 1)

export const fromNumber = (n: number) => UnitInterval.option(n)
export const fromNumberUnsafe = UnitInterval
