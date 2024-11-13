import { B, O } from './imports.ts'

const _: unique symbol = Symbol()

export type NonEmptyTrimmedString = string &
	B.Brand<typeof _>

export const isNonBlank = (string: string) =>
	/\S/.test(string)

export const unsafe_fromString = (
	value: string,
) => {
	const string = value.trim()

	return B.refined<NonEmptyTrimmedString>(
		_ => isNonBlank(_),
		() => B.error('String is blank'),
	)(string)
}

export const fromString = O.liftThrowable(
	(_: string) => unsafe_fromString(_),
)
