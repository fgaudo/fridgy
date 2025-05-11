import { B, flow } from './imports.ts'

export type NonEmptyTrimmedString = B.Branded<
	string,
	'NonEmptyTrimmedString'
>

/** @internal */
export const NonEmptyTrimmedString =
	B.refined<NonEmptyTrimmedString>(
		string => /^\S.*\S$|^\S$/.test(string),
		() =>
			B.error(
				`Provided string is either empty or non-trimmed`,
			),
	)

export const isNonEmptyTrimmedString =
	NonEmptyTrimmedString.is

export const fromString = flow(
	trim,
	NonEmptyTrimmedString.option,
)

export const unsafeFromString = flow(
	trim,
	NonEmptyTrimmedString,
)

function trim(s: string): string {
	return s.trim()
}
