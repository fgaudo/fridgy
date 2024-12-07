/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { O } from '../imports.ts'
import { isInteger } from './index.ts'

const _: unique symbol = Symbol()

export const isNonNegativeInteger = (
	value: unknown,
): value is number =>
	isInteger(value) && value >= 0

export type NonNegativeInteger = number & {
	[_]: true
}

export const unsafe_fromNumber: (
	number: number,
) => NonNegativeInteger = number => {
	if (!isNonNegativeInteger(number)) {
		throw new Error('Not a non-negative integer')
	}

	return number as NonNegativeInteger
}

export const fromNumber: (
	number: number,
) => O.Option<NonNegativeInteger> =
	O.liftThrowable(number =>
		unsafe_fromNumber(number),
	)