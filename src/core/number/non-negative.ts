import * as Brand from 'effect/Brand'

export type NonNegative = Brand.Branded<number, `NonNegative`>

/** @internal **/
export const NonNegative = Brand.refined<NonNegative>(
	n => n >= 0,
	n => Brand.error(`Expected ${n.toString(10)} to be a non-negative number`),
)

export const fromNumber = (number: number) => NonNegative.option(number)
export const unsafeFromNumber = NonNegative
export const isNonNegative = (number: number) => NonNegative.is(number)
