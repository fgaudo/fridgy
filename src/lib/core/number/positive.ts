import { B } from '../imports.ts'

export type Positive = B.Branded<
	number,
	'Positive'
>

/** @internal **/
export const Positive = B.refined<Positive>(
	n => n > 0,
	n =>
		B.error(
			`Expected ${n} to be a positive number`,
		),
)

export const fromNumber = Positive.option
export const unsafeFromNumber = Positive
export const isNonNegative = Positive.is
