import { O, Ord } from './imports'

const symbol: unique symbol = Symbol()

export interface NonNegativeInteger {
	[symbol]: number
}

export const fromNumber = (number: number) =>
	O.gen(function* () {
		if (!isNonNegativeInteger(number)) {
			return yield* O.none()
		}

		return { [symbol]: number }
	})

export const toNumber = (
	integer: NonNegativeInteger,
) => integer[symbol]

export const unsafe_fromNumber = (
	number: number,
) => {
	if (!isNonNegativeInteger(number)) {
		throw new Error('Not an integer')
	}
	return { [symbol]: number }
}

export const order: Ord.Order<
	NonNegativeInteger
> = (self, that) =>
	Ord.number(self[symbol], that[symbol])

export const isNonNegativeInteger = (
	value: unknown,
): value is number =>
	Number.isInteger(value) &&
	(value as number) >= 0
