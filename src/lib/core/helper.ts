import { Logger, ParseResult } from 'effect'
import { UnknownException } from 'effect/Cause'
import { fail, succeed } from 'effect/Exit'
import type { ParseIssue } from 'effect/ParseResult'

import { Eff } from '$lib/core/imports.ts'

export const fallback: <A>(
	def: A,
) => (
	issue: ParseIssue,
) => Eff.Effect<A, ParseIssue> = def => issue =>
	Eff.gen(function* () {
		Eff.logError(
			yield* ParseResult.TreeFormatter.formatIssue(
				issue,
			),
		)
		return yield* Eff.succeed(def)
	})

export const tryPromise = <A>(
	evaluate: (
		signal?: AbortSignal,
	) => PromiseLike<A>,
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

export const effectWithLogs = (
	effect: Eff.Effect<unknown, unknown>,
) => {
	return Eff.unsandbox(
		Eff.catchTags(
			Eff.sandbox(
				effect.pipe(Eff.provide(Logger.pretty)),
			),
			{
				Die: defect =>
					Eff.logFatal(defect.toString()),
			},
		),
	)
}
