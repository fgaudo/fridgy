import { B } from '../imports.ts'

export type NonNegative = B.Branded<number, `NonNegative`>

/** @internal **/
export const NonNegative = B.refined<NonNegative>(
	n => n >= 0,
	n => B.error(`Expected ${n.toString(10)} to be a non-negative number`),
)

export const fromNumber = (number: number) => NonNegative.option(number)
export const unsafeFromNumber = NonNegative
export const isNonNegative = (number: number) => NonNegative.is(number)
