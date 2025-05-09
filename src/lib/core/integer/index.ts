import { B } from '../imports.ts'

export type Integer = B.Branded<number, 'Integer'>

/** @internal */
export const Integer = B.refined<Integer>(
	n => Number.isInteger(n),
	n => B.error(`Expected ${n} to be an integer`),
)

export const make = Integer.option
export const unsafeMake = Integer
export const isNonNegative = Integer.is
