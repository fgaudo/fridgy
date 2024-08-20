import { E, Ord } from './imports'
import { isInteger } from './utils'

const integerSymbol: unique symbol = Symbol()

export interface Integer {
	[integerSymbol]: number
}

export const fromNumber = (number: number) =>
	E.gen(function* () {
		if (!isInteger(number)) {
			return yield* E.left(
				new Error('not an integer'),
			)
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
