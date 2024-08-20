import { E, Ord } from './imports'

const stringSymbol: unique symbol = Symbol()

export interface NonEmptyTrimmedString {
	[stringSymbol]: string
}

export const fromString = (string: string) =>
	E.gen(function* () {
		const str = string.trim()
		if (!isNonBlank(str)) {
			return yield* E.left(
				new Error('Not a non-empty string'),
			)
		}

		return { [stringSymbol]: str }
	})

export const toString = (
	string: NonEmptyTrimmedString,
) => string[stringSymbol]

export const unsafe_fromString = (
	string: string,
) => {
	const str = string.trim()

	if (!isNonBlank(str)) {
		throw new Error('Not a non-empty string')
	}
	return { [stringSymbol]: str }
}

export const isNonBlank = (string: string) =>
	/\S/.test(string)

export const order: Ord.Order<
	NonEmptyTrimmedString
> = (self, that) =>
	Ord.string(
		self[stringSymbol],
		that[stringSymbol],
	)
