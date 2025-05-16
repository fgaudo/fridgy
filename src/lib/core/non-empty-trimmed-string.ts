import { B, Sc, flow } from './imports.ts'

export type NonEmptyTrimmedString = B.Branded<string, `NonEmptyTrimmedString`>

/** @internal */
export const NonEmptyTrimmedString = B.refined<NonEmptyTrimmedString>(
	string => /^\S.*\S$|^\S$/.test(string),
	() => B.error(`Provided string is either empty or non-trimmed`),
)
export const NonEmptyTrimmedStringSchema = Sc.fromBrand(NonEmptyTrimmedString)(
	Sc.String,
).annotations({
	arbitrary: () => fc => fc.stringMatching(/\S/).map(unsafeFromString),
})

export const unsafeFromString = flow(trim, NonEmptyTrimmedString)

export const isNonEmptyTrimmedString = (s: string) =>
	NonEmptyTrimmedString.is(s)

export const fromString = flow(trim, s => NonEmptyTrimmedString.option(s))

function trim(s: string): string {
	return s.trim()
}
