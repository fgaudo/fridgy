import type { ParseIssue } from '@effect/schema/ParseResult'

import { Eff } from '@/core/imports'

export const fallback: <A>(
	def: A,
) => (
	issue: ParseIssue,
) => Eff.Effect<A, ParseIssue> = def => issue =>
	Eff.gen(function* () {
		yield* Eff.logWarning(
			'Problem decoding',
		).pipe(Eff.annotateLogs({ issue }))
		return yield* Eff.succeed(def)
	})
