import { B, O } from '../imports.ts'
import { isInteger } from './index.ts'

const _: unique symbol = Symbol()

export type PositiveInteger = number &
	B.Brand<typeof _>

export const isPositiveInteger = (
	value: unknown,
): value is number =>
	isInteger(value) && value > 0

export const unsafe_fromNumber: (
	number: number,
) => PositiveInteger = B.refined<PositiveInteger>(
	value => isPositiveInteger(value),
	() => B.error('Not a positive integer'),
)

export const fromNumber: (
	number: number,
) => O.Option<PositiveInteger> = O.liftThrowable(
	number => unsafe_fromNumber(number),
)
