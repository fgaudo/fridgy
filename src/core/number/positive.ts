import * as Brand from 'effect/Brand'

export type Positive = Brand.Branded<number, `Positive`>

/** @internal **/
export const Positive = Brand.refined<Positive>(
	n => n > 0,
	n => Brand.error(`Expected ${n.toString(10)} to be a positive number`),
)

export const fromNumber = (number: number) => Positive.option(number)
export const unsafeFromNumber = Positive
export const isNonNegative = (number: number) => Positive.is(number)
