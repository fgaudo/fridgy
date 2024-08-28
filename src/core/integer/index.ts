import { B, O } from '../imports.js'

const _: unique symbol = Symbol()

export type Integer = number & B.Brand<typeof _>

export const isInteger = (
	value: unknown,
): value is number => Number.isInteger(value)

export const unsafe_fromNumber: (
	number: number,
) => Integer = B.refined<Integer>(isInteger, () =>
	B.error('Not an integer'),
)

export const fromNumber: (
	number: number,
) => O.Option<Integer> = O.liftThrowable(
	unsafe_fromNumber,
)
