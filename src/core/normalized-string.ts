import * as Brand from 'effect/Brand'
import { pipe } from 'effect/Function'
import * as Opt from 'effect/Option'
import * as _Schema from 'effect/Schema'
import * as Str from 'effect/String'

export type NormalizedString = Brand.Branded<string, 'core.NormalizedString'>

const NormalizedString = Brand.nominal<NormalizedString>()

export const fromString = (string: string): Opt.Option<NormalizedString> => {
	if (string.length <= 0) {
		return Opt.none<NormalizedString>()
	}

	return pipe(
		string,
		Str.normalize('NFKC'),
		Str.trim,
		Str.replaceAll(/\s{2,}/g, ' '),
		s => NormalizedString.option(s),
	)
}
