import { nonBlankString } from './arbitraries.ts'
import { B, Sc, flow } from './imports.ts'

export type NonEmptyTrimmedString = B.Branded<string, `NonEmptyTrimmedString`>

/** @internal */
export const NonEmptyTrimmedString = B.refined<NonEmptyTrimmedString>(
	string => /^\S.*\S$|^\S$/.test(string),
	() => B.error(`Provided string is either empty or non-trimmed`),
)
export const NonEmptyTrimmedStringSchema = Sc.fromBrand(NonEmptyTrimmedString)(
	Sc.String,
).annotations({ arbitrary: () => () => nonEmptyTrimmedString })

export const unsafeFromString = flow(trim, NonEmptyTrimmedString)

const nonEmptyTrimmedString = nonBlankString.map(unsafeFromString)

export const isNonEmptyTrimmedString = NonEmptyTrimmedString.is

export const fromString = flow(trim, NonEmptyTrimmedString.option)

function trim(s: string): string {
	return s.trim()
}
