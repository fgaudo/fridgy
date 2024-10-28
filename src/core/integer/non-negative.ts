import { B, O } from '../imports.ts'
import { isInteger } from './index.ts'

const _: unique symbol = Symbol()

export const isNonNegativeInteger = (
	value: unknown,
): value is number =>
	isInteger(value) && value >= 0

export type NonNegativeInteger = number &
	B.Brand<typeof _>

export const unsafe_fromNumber: (
	number: number,
) => NonNegativeInteger =
	B.refined<NonNegativeInteger>(
		value => isNonNegativeInteger(value),
		() => B.error('Not a non-negative integer'),
	)

export const fromNumber: (
	number: number,
) => O.Option<NonNegativeInteger> =
	O.liftThrowable(number =>
		unsafe_fromNumber(number),
	)
