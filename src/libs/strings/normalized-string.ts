import { flow, pipe } from 'effect/Function'
import type * as Opt from 'effect/Option'
import * as _Schema from 'effect/Schema'
import * as Str from 'effect/String'

// Control characters and invisible marks, but not whitespace (tabs and newlines become spaces instead), nor
// ZWJ and ZWNJ (U+200D, U+200C), which emoji sequences and some scripts need.
const invisible = /(?!\s)[\p{Cc}­​⁠]/gu

// NFC, not NFKC: NFKC would rewrite what the user typed and meant (H₂O, m², ①).
const normalize = (string: string): string =>
  pipe(
    string,
    Str.normalize('NFC'),
    Str.replaceAll(invisible, ''),
    Str.replaceAll(/\s+/g, ' '),
    Str.trim,
  )

/** A non-empty string in NFC form, without control characters or invisible marks, trimmed, single-spaced. */
export const Schema = _Schema.String.check(
  _Schema.makeFilter((string: string) => string.length > 0 && normalize(string) === string),
).pipe(_Schema.brand('libs.NormalizedString'))

export type NormalizedString = typeof Schema.Type

// The invariant is checked on the normalized value: checking the input instead
// would accept strings that become empty once normalized (e.g. "\t").
export const fromString: (string: string) => Opt.Option<NormalizedString> = flow(
  normalize,
  _Schema.decodeOption(Schema),
)
