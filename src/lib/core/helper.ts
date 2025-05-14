import { UnknownException } from 'effect/Cause'
import { fail, succeed } from 'effect/Exit'
import type { ParseIssue } from 'effect/ParseResult'

import { Eff } from '$lib/core/imports.ts'

export const fallback: <A>(
	def: A,
) => (issue: ParseIssue) => Eff.Effect<A, ParseIssue> = def => () =>
	Eff.gen(function* () {
		return yield* Eff.succeed(def)
	})

export const tryPromise = <A>(
	evaluate: (signal?: AbortSignal) => PromiseLike<A>,
): Eff.Effect<A, UnknownException> =>
	Eff.async((resolve, signal) => {
		evaluate(signal).then(
			a => {
				resolve(succeed(a))
			},
			(e: unknown) => {
				resolve(fail(new UnknownException(e)))
			},
		)
	})
