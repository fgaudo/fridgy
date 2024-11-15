/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { O } from './imports.ts'

const _: unique symbol = Symbol()

export type NonEmptyTrimmedString = string & {
	[_]: true
}

export const isNonBlank = (string: string) =>
	/\S/.test(string)

export const unsafe_fromString = (
	value: string,
) => {
	const string = value.trim()

	if (!isNonBlank(string)) {
		throw new Error('Not a non-empty string')
	}

	return string as NonEmptyTrimmedString
}

export const fromString = O.liftThrowable(
	(value: string) => unsafe_fromString(value),
)
