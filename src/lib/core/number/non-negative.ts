import { B } from '../imports.ts'

export type NonNegative = B.Branded<
	number,
	'NonNegative'
>

/** @internal **/
export const NonNegative = B.refined<NonNegative>(
	n => n >= 0,
	n =>
		B.error(
			`Expected ${n} to be a non-negative number`,
		),
)

export const make = NonNegative.option
export const unsafeMake = NonNegative
export const isNonNegative = NonNegative.is
