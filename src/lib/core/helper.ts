import * as Cause from 'effect/Cause'
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as ParseResult from 'effect/ParseResult'

export const fallback: <A>(
	def: A,
) => (
	issue: ParseResult.ParseIssue,
) => Effect.Effect<A, ParseResult.ParseIssue> = def => () =>
	Effect.gen(function* () {
		return yield* Effect.succeed(def)
	})

export const tryPromise = <A>(
	evaluate: (signal?: AbortSignal) => PromiseLike<A>,
): Effect.Effect<A, Cause.UnknownException> =>
	Effect.async((resolve, signal) => {
		evaluate(signal).then(
			a => {
				resolve(Exit.succeed(a))
			},
			(e: unknown) => {
				resolve(Exit.fail(new Cause.UnknownException(e)))
			},
		)
	})
