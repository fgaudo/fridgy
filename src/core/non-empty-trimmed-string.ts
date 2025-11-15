import * as Brand from 'effect/Brand'
import { flow } from 'effect/Function'
import * as _Schema from 'effect/Schema'

export type NonEmptyTrimmedString = Brand.Branded<
	string,
	`NonEmptyTrimmedString`
>

/** @internal */
export const _NonEmptyTrimmedString = Brand.refined<NonEmptyTrimmedString>(
	string => /^\S.*\S$|^\S$/.test(string),
	() => Brand.error(`Provided string is either empty or non-trimmed`),
)
export const Schema = _Schema
	.fromBrand(_NonEmptyTrimmedString)(_Schema.String)
	.annotations({
		arbitrary: () => fc => fc.stringMatching(/\S/).map(unsafeFromString),
	})

export const unsafeFromString = flow(trim, _NonEmptyTrimmedString)

export const isNonEmptyTrimmedString = (s: string) =>
	_NonEmptyTrimmedString.is(s)

export const fromString = flow(trim, s => _NonEmptyTrimmedString.option(s))

function trim(s: string): string {
	return s.trim()
}
