import { B } from '../imports.ts'

export type NonNegative = B.Branded<number, `NonNegative`>

/** @internal **/
export const NonNegative = B.refined<NonNegative>(
	n => n >= 0,
	n => B.error(`Expected ${n} to be a non-negative number`),
)

export const fromNumber = NonNegative.option
export const unsafeFromNumber = NonNegative
export const isNonNegative = NonNegative.is
