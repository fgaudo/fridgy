import { O } from '../imports.ts'

const _: unique symbol = Symbol()

export type Integer = number & {
	[_]: true
}

export const isInteger = (
	value: unknown,
): value is number => Number.isInteger(value)

export const unsafe_fromNumber: (
	number: number,
) => Integer = number => {
	if (!isInteger(number)) {
		throw new Error('Not an integer')
	}

	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return number as Integer
}

export const fromNumber: (
	number: number,
) => O.Option<Integer> = O.liftThrowable(
	unsafe_fromNumber,
)
