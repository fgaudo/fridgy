import type { ParseIssue } from '@effect/schema/ParseResult'
import { UnknownException } from 'effect/Cause'
import { fail, succeed } from 'effect/Exit'

import { Eff } from '@/core/imports.js'

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

export const runForkWithLogs = (
	effect: Eff.Effect<unknown, unknown>,
) =>
	Eff.runFork(
		Eff.unsandbox(
			Eff.catchTags(Eff.sandbox(effect), {
				Die: defect =>
					Eff.logError(defect.toString()),
			}),
		),
	)
