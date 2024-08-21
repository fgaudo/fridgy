import { O, Ord } from './imports'

const integerSymbol: unique symbol = Symbol()

export interface Integer {
	[integerSymbol]: number
}

export const fromNumber = (number: number) =>
	O.gen(function* () {
		if (!isInteger(number)) {
			return yield* O.none()
		}

		return { [integerSymbol]: number }
	})

export const toNumber = (integer: Integer) =>
	integer[integerSymbol]

export const unsafe_fromNumber = (
	number: number,
) => {
	if (!isInteger(number)) {
		throw new Error('Not an integer')
	}
	return { [integerSymbol]: number }
}

export const order: Ord.Order<Integer> = (
	self,
	that,
) =>
	Ord.number(
		self[integerSymbol],
		that[integerSymbol],
	)

export const isInteger = (
	value: unknown,
): value is number => Number.isInteger(value)
