import { B, FC, Sc } from '../imports.ts'

export type Integer = B.Branded<number, `Integer`>

/** @internal */
export const Integer = B.refined<Integer>(
	n => Number.isInteger(n),
	n => B.error(`Expected ${n} to be an integer`),
)

export const IntegerSchema = Sc.fromBrand(Integer)(Sc.Number).annotations({
	arbitrary: () => () => FC.integer().map(unsafeFromNumber),
})

export const fromNumber = Integer.option
export const unsafeFromNumber = Integer
export const isNonNegative = Integer.is
