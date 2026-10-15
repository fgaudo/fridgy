import * as Brand from 'effect/Brand'
import { pipe } from 'effect/Function'
import type * as Opt from 'effect/Option'
import * as Str from 'effect/String'

/** A non-empty string in NFKC form, trimmed, without runs of whitespace. */
export type NormalizedString = Brand.Branded<string, 'core.NormalizedString'>

const normalize = (string: string): string =>
	pipe(
		string,
		Str.normalize('NFKC'),
		Str.trim,
		Str.replaceAll(/\s{2,}/g, ' '),
	)

// The invariant is checked on the normalized value: checking the input instead
// would accept strings that become empty once normalized (e.g. "\t").
const NormalizedString = Brand.make<NormalizedString>(
	(string) => string.length > 0 && normalize(string) === string,
)

export const fromString = (string: string): Opt.Option<NormalizedString> =>
	NormalizedString.option(normalize(string))
