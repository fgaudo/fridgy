import { B } from '../imports.ts'

export type Positive = B.Branded<number, `Positive`>

/** @internal **/
export const Positive = B.refined<Positive>(
	n => n > 0,
	n => B.error(`Expected ${n.toString(10)} to be a positive number`),
)

export const fromNumber = (number: number) => Positive.option(number)
export const unsafeFromNumber = Positive
export const isNonNegative = (number: number) => Positive.is(number)
