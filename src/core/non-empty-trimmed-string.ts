import * as Brand from 'effect/Brand'
import { flow } from 'effect/Function'
import * as _Schema from 'effect/Schema'

export type NonEmptyTrimmedString = Brand.Branded<
	string,
	'core.NonEmptyTrimmedString'
>

const NonEmptyTrimmedString = Brand.make<NonEmptyTrimmedString>(string =>
	/^\S.*\S$|^\S$/.test(string),
)

function trim(s: string): string {
	return s.trim()
}

export const makeUnsafe = flow(trim, NonEmptyTrimmedString)

export const make = flow(trim, s => NonEmptyTrimmedString.option(s))

export const Schema = _Schema.fromBrand(
	'core.NonEmptyTrimmedString',
	NonEmptyTrimmedString,
)(_Schema.String)
