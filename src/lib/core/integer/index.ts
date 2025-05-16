import { B, Sc } from '../imports.ts'

export type Integer = B.Branded<number, `Integer`>

/** @internal */
export const Integer = B.refined<Integer>(
	n => Number.isInteger(n),
	n => B.error(`Expected ${n.toString(10)} to be an integer`),
)

export const IntegerSchema = Sc.fromBrand(Integer)(Sc.Number).annotations({
	arbitrary: () => fc => fc.integer().map(unsafeFromNumber),
})

export const fromNumber = (n: number) => Integer.option(n)
export const unsafeFromNumber = Integer
export const isNonNegative = (n: number) => Integer.is(n)
