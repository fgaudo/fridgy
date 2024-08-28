import { isInteger } from '.'
import { B, O } from '../imports'

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
		isNonNegativeInteger,
		() => B.error('Not a positive integer'),
	)

export const fromNumber: (
	number: number,
) => O.Option<NonNegativeInteger> =
	O.liftThrowable(unsafe_fromNumber)
